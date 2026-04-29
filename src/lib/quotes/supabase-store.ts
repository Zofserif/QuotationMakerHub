import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createClientAccessToken,
  defaultTokenExpiry,
  hashClientAccessToken,
} from "@/lib/client-links/token";
import { normalizeCurrency } from "@/lib/currency";
import {
  calculateQuoteTotals,
  type TaxMode,
  withCalculatedLineTotals,
} from "@/lib/quotes/calculate-totals";
import type {
  LineItemData,
  LineItemDataDraft,
  LineItemImageMimeType,
  LineItemImageUploadResult,
} from "@/lib/line-item-data/types";
import { mergeQuoteTemplate } from "@/lib/quote-templates/defaults";
import { formatQuoteNumber } from "@/lib/quote-templates/numbering";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import {
  createVersionSnapshot,
  hashSnapshot,
} from "@/lib/quotes/create-version-snapshot";
import { getAggregateQuoteStatus } from "@/lib/quotes/quote-state";
import type {
  AuditEvent,
  ClientInput,
  ClientQuoteView,
  DeleteQuoteResult,
  Quote,
  QuoteDraft,
  QuoteLineItem,
  QuoteRecipient,
  QuoteStatus,
  QuoteVisibility,
  EnsureQuoteShareLinksResult,
  SendQuoteResult,
  QuoteVersion,
  QuoteVersionSnapshot,
  RecipientStatus,
  SignatureAsset,
  SignatureField,
  SignaturePlacement,
  SourceMethod,
  UpdateQuoteResult,
  UpdateQuoteVisibilityResult,
} from "@/lib/quotes/types";
import {
  buildQuoteShareLinks,
  buildUnavailableQuoteShareLinks,
  isQuoteShareable,
} from "@/lib/quotes/share-links";
import { renderQuotePdf } from "@/lib/pdf/render-pdf";
import { dataUrlToBuffer, hashImageBytes } from "@/lib/signatures/hash-image";
import {
  lineItemImageStoragePath,
  pdfStoragePath,
  signatureStoragePath,
} from "@/lib/signatures/storage-paths";

const SIGNATURE_BUCKET = "signature-assets";
const PDF_BUCKET = "quote-pdfs";
const LINE_ITEM_IMAGE_BUCKET = "line-item-images";

export type QuoterContext = {
  clerkUserId: string;
  organizationId: string;
};

export type PlaceSignatureResult =
  | { ok: true; asset: SignatureAsset; placement: SignaturePlacement }
  | {
      ok: false;
      code: "TOKEN_INVALID" | "RECIPIENT_LOCKED" | "SIGNATURE_REQUIRED";
    };

export type UpdateQuoterSignatureResult =
  | { ok: true; quote: Quote }
  | {
      ok: false;
      code: "QUOTE_NOT_FOUND" | "QUOTE_LOCKED";
    };

export type AcceptQuoteResult =
  | {
      ok: true;
      quote: Quote;
      recipient: QuoteRecipient;
      acceptedAt: string;
      locked: boolean;
    }
  | {
      ok: false;
      code: "TOKEN_INVALID" | "RECIPIENT_LOCKED" | "QUOTE_NOT_FOUND" | "SIGNATURE_REQUIRED";
    };

export type PdfExportResult = {
  exportRecord: {
    pdfExportId: string;
    downloadUrl: string;
    expiresInSeconds: number;
  };
  version: QuoteVersion;
  sha256: string;
};

type OrganizationRow = {
  id: string;
  clerk_org_id: string | null;
  name: string;
};

type ClientRow = {
  id: string;
  organization_id: string;
  company_name: string | null;
  contact_name: string;
  email: string | null;
  phone: string | null;
  billing_address: { value?: string } | null;
};

type QuoteRow = {
  id: string;
  organization_id: string;
  archived_at: string | null;
  archived_by_clerk_user_id: string | null;
  deleted_at: string | null;
  deleted_by_clerk_user_id: string | null;
  quote_number: string;
  quotation_name: string;
  title: string;
  status: QuoteStatus;
  currency: string;
  subtotal_minor: number | string;
  discount_minor: number | string;
  tax_minor: number | string;
  total_minor: number | string;
  valid_until: string | null;
  request_summary: string | null;
  terms: string | null;
  notes: string | null;
  template_snapshot: QuoteTemplate | null;
  quoter_printed_name: string | null;
  quoter_signature_asset_id: string | null;
  current_version: number;
  created_by_clerk_user_id: string;
  sent_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

type QuoteLineItemRow = {
  id: string;
  quote_id: string;
  sort_order: number;
  name: string;
  description: string | null;
  unit: string | null;
  quantity: number | string;
  unit_price_minor: number | string;
  discount_minor: number | string;
  tax_rate: number | string;
  line_total_minor: number | string;
  description_image_storage_path: string | null;
  description_image_mime_type: LineItemImageMimeType | null;
};

type QuoteRecipientRow = {
  id: string;
  quote_id: string;
  quote_version_id: string | null;
  client_id: string | null;
  name: string;
  email: string;
  role: "client" | "quoter";
  status: RecipientStatus;
  access_token: string | null;
  access_token_hash: string;
  access_token_expires_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  locked_at: string | null;
};

type SignatureFieldRow = {
  id: string;
  quote_id: string;
  quote_version_id: string | null;
  recipient_id: string | null;
  signer_type: "quoter" | "client";
  label: string;
  anchor_key: string;
  required: boolean;
  width_px: number;
  height_px: number;
};

type QuoteVersionRow = {
  id: string;
  quote_id: string;
  version_number: number;
  snapshot: QuoteVersionSnapshot;
  snapshot_sha256: string;
  created_by_clerk_user_id: string;
  created_at: string;
};

type SignatureAssetRow = {
  id: string;
  organization_id: string | null;
  owner_type: "quoter" | "client";
  owner_ref: string;
  storage_path: string;
  mime_type: "image/png";
  width_px: number | null;
  height_px: number | null;
  image_sha256: string;
  source_method: SourceMethod;
  created_at: string;
};

type SignaturePlacementRow = {
  id: string;
  quote_id: string;
  quote_version_id: string;
  signature_field_id: string;
  recipient_id: string | null;
  signature_asset_id: string;
  placed_at: string;
};

type AuditEventRow = {
  id: string;
  actor_type: "quoter" | "client" | "system";
  actor_ref: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type QuoteTemplateRow = {
  id: string;
  organization_id: string;
  content: QuoteTemplate;
  created_by_clerk_user_id: string;
  created_at: string;
  updated_at: string;
};

type LineItemDataRow = {
  id: string;
  organization_id: string;
  title: string;
  detailed_description: string;
  unit: string;
  unit_price_minor: number | string;
  description_image_storage_path: string | null;
  description_image_mime_type: LineItemImageMimeType | null;
  created_by_clerk_user_id: string;
  created_at: string;
  updated_at: string;
};

type SupabaseError = {
  message: string;
  code?: string;
} | null;

export async function getSupabaseQuoteTemplate(quoter: QuoterContext) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);

  return getQuoteTemplateContent(db, organization.id);
}

export async function updateSupabaseQuoteTemplate(
  quoter: QuoterContext,
  template: QuoteTemplate,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const now = new Date().toISOString();
  const content = mergeQuoteTemplate(template);
  const { error } = await db.from("quote_templates").upsert(
    {
      organization_id: organization.id,
      content,
      created_by_clerk_user_id: quoter.clerkUserId,
      updated_at: now,
    },
    { onConflict: "organization_id" },
  );

  throwIfError(error, "Save quote template");

  return content;
}

export async function listSupabaseLineItemData(quoter: QuoterContext) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const { data, error } = await db
    .from("line_item_data")
    .select("*")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });

  throwIfError(error, "List line item data");

  return Promise.all(
    ((data ?? []) as LineItemDataRow[]).map((row) =>
      mapLineItemDataRow(db, row),
    ),
  );
}

export async function createSupabaseLineItemData(
  quoter: QuoterContext,
  draft: LineItemDataDraft,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("line_item_data")
    .insert({
      organization_id: organization.id,
      title: draft.title,
      detailed_description: draft.detailedDescription,
      unit: draft.unit,
      unit_price_minor: draft.unitPriceMinor,
      description_image_storage_path: emptyToNull(
        draft.descriptionImageStoragePath,
      ),
      description_image_mime_type: draft.descriptionImageMimeType ?? null,
      created_by_clerk_user_id: quoter.clerkUserId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  throwIfError(error, "Create line item data");

  return mapLineItemDataRow(db, data as LineItemDataRow);
}

export async function updateSupabaseLineItemData(
  quoter: QuoterContext,
  lineItemDataId: string,
  draft: LineItemDataDraft,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const { data, error } = await db
    .from("line_item_data")
    .update({
      title: draft.title,
      detailed_description: draft.detailedDescription,
      unit: draft.unit,
      unit_price_minor: draft.unitPriceMinor,
      description_image_storage_path: emptyToNull(
        draft.descriptionImageStoragePath,
      ),
      description_image_mime_type: draft.descriptionImageMimeType ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lineItemDataId)
    .eq("organization_id", organization.id)
    .select("*")
    .maybeSingle();

  throwIfError(error, "Update line item data");

  return data ? mapLineItemDataRow(db, data as LineItemDataRow) : null;
}

export async function deleteSupabaseLineItemData(
  quoter: QuoterContext,
  lineItemDataId: string,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const { data, error } = await db
    .from("line_item_data")
    .delete()
    .eq("id", lineItemDataId)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  throwIfError(error, "Delete line item data");

  return Boolean(data);
}

export async function uploadSupabaseLineItemDataImage(
  quoter: QuoterContext,
  file: File,
): Promise<LineItemImageUploadResult> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const extension = extensionForMimeType(file.type as LineItemImageMimeType);
  const storagePath = lineItemImageStoragePath({
    organizationId: organization.id,
    imageId: randomUUID(),
    extension,
  });
  const objectPath = stripBucketPrefix(storagePath, LINE_ITEM_IMAGE_BUCKET);
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await db.storage
    .from(LINE_ITEM_IMAGE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  throwIfError(error, "Upload line item image");

  return {
    storagePath,
    mimeType: file.type as LineItemImageMimeType,
    url: await createStorageSignedUrl(db, LINE_ITEM_IMAGE_BUCKET, storagePath),
  };
}

export async function listSupabaseQuotes(
  quoter: QuoterContext,
  options: { visibility?: QuoteVisibility } = {},
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const visibility = options.visibility ?? "active";
  const query = db
    .from("quotes")
    .select("*")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyQuoteVisibilityFilter(
    query,
    visibility,
  );

  throwIfError(error, "List quotes");

  return Promise.all(
    ((data ?? []) as QuoteRow[]).map((row) =>
      loadQuote(db, row.id, organization.id, row),
    ),
  ).then((quotes) => quotes.filter((quote): quote is Quote => Boolean(quote)));
}

export async function getSupabaseQuote(
  quoter: QuoterContext,
  quoteId: string,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  return loadQuote(db, quoteId, organization.id);
}

export async function createSupabaseQuote(
  quoter: QuoterContext,
  draft: QuoteDraft,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const liveTemplate = await getQuoteTemplateContent(db, organization.id);
  const templateSnapshot = mergeQuoteTemplate(
    draft.templateSnapshot ?? liveTemplate,
  );
  const quoteCurrency = normalizeCurrency(
    draft.currency || templateSnapshot.lineItems.unitPrice.currency,
  );
  const taxMode = getTemplateTaxMode(templateSnapshot);
  const client = await upsertClient(db, organization.id, draft.client);
  const lineItems = normalizeLineItems(draft.lineItems, templateSnapshot);
  const totals = calculateQuoteTotals(
    lineItems,
    draft.quoteLevelDiscountMinor ?? 0,
    taxMode,
  );
  const quoteId = randomUUID();
  const recipientId = randomUUID();
  const signatureFieldId = randomUUID();
  const now = new Date().toISOString();
  const quoteNumber = await nextQuoteNumber(
    db,
    organization.id,
    templateSnapshot.company.quoteNumberFormat,
  );
  const dormantToken = createClientAccessToken();

  const { error: quoteError } = await db.from("quotes").insert({
    id: quoteId,
    organization_id: organization.id,
    quote_number: quoteNumber,
    quotation_name: draft.quotationName,
    title: draft.title,
    status: "draft",
    currency: quoteCurrency,
    subtotal_minor: totals.subtotalMinor,
    discount_minor: totals.discountMinor,
    tax_minor: totals.taxMinor,
    total_minor: totals.totalMinor,
    valid_until: emptyToNull(draft.validUntil),
    request_summary: emptyToNull(draft.requestSummary),
    terms: emptyToNull(draft.terms),
    notes: emptyToNull(draft.notes),
    template_snapshot: templateSnapshot,
    quoter_printed_name: emptyToNull(draft.quoterPrintedName),
    quoter_signature_asset_id: null,
    current_version: 1,
    created_by_clerk_user_id: quoter.clerkUserId,
    created_at: now,
    updated_at: now,
  });

  throwIfError(quoteError, "Create quote");

  await insertLineItems(db, quoteId, lineItems);

  const { error: recipientError } = await db.from("quote_recipients").insert({
    id: recipientId,
    quote_id: quoteId,
    client_id: client.id,
    name: draft.client.contactName,
    email: normalizeEmail(draft.client.email),
    role: "client",
    status: "pending",
    access_token_hash: hashClientAccessToken(dormantToken),
    access_token_expires_at: defaultTokenExpiry(1),
  });

  throwIfError(recipientError, "Create quote recipient");

  const { error: fieldError } = await db.from("signature_fields").insert({
    id: signatureFieldId,
    quote_id: quoteId,
    recipient_id: recipientId,
    signer_type: "client",
    label: "Client Signature",
    anchor_key: "client_signature_block_primary",
    required: true,
    width_px: 240,
    height_px: 96,
  });

  throwIfError(fieldError, "Create signature field");

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: "quote.created",
  });

  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    throw new Error("Created quote could not be loaded.");
  }

  return quote;
}

export async function updateSupabaseQuote(
  quoter: QuoterContext,
  quoteId: string,
  draft: QuoteDraft,
): Promise<UpdateQuoteResult> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const existing = await loadQuote(db, quoteId, organization.id);

  if (!existing) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  if (existing.status === "locked") {
    return { ok: false, code: "QUOTE_LOCKED" };
  }

  const liveTemplate = await getQuoteTemplateContent(db, organization.id);
  const templateSnapshot = mergeQuoteTemplate(
    existing.templateSnapshot ?? draft.templateSnapshot ?? liveTemplate,
  );
  const quoteCurrency = normalizeCurrency(
    draft.currency || templateSnapshot.lineItems.unitPrice.currency,
  );
  const taxMode = getTemplateTaxMode(templateSnapshot);
  const existingRecipient = existing.recipients.find(
    (recipient) => recipient.role === "client",
  );
  const client = await upsertClient(
    db,
    organization.id,
    draft.client,
    existingRecipient?.clientId,
  );
  const lineItems = normalizeLineItems(draft.lineItems, templateSnapshot);
  const totals = calculateQuoteTotals(
    lineItems,
    draft.quoteLevelDiscountMinor ?? 0,
    taxMode,
  );
  const now = new Date().toISOString();

  const { error: quoteError } = await db
    .from("quotes")
    .update({
      quotation_name: draft.quotationName,
      title: draft.title,
      currency: quoteCurrency,
      subtotal_minor: totals.subtotalMinor,
      discount_minor: totals.discountMinor,
      tax_minor: totals.taxMinor,
      total_minor: totals.totalMinor,
      valid_until: emptyToNull(draft.validUntil),
      request_summary: emptyToNull(draft.requestSummary),
      terms: emptyToNull(draft.terms),
      notes: emptyToNull(draft.notes),
      template_snapshot: templateSnapshot,
      quoter_printed_name: emptyToNull(draft.quoterPrintedName),
      updated_at: now,
    })
    .eq("id", quoteId)
    .eq("organization_id", organization.id);

  throwIfError(quoteError, "Update quote");

  const { error: deleteLineItemsError } = await db
    .from("quote_line_items")
    .delete()
    .eq("quote_id", quoteId);

  throwIfError(deleteLineItemsError, "Replace line items");
  await insertLineItems(db, quoteId, lineItems);

  if (existingRecipient) {
    const { error: recipientError } = await db
      .from("quote_recipients")
      .update({
        client_id: client.id,
        name: draft.client.contactName,
        email: normalizeEmail(draft.client.email),
      })
      .eq("id", existingRecipient.id)
      .eq("quote_id", quoteId);

    throwIfError(recipientError, "Update quote recipient");
  } else {
    await createDefaultRecipientAndField(db, quoteId, client, draft.client);
  }

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: "quote.updated",
  });

  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  return { ok: true, quote };
}

export async function updateSupabaseQuoteVisibility(
  quoter: QuoterContext,
  quoteId: string,
  visibility: QuoteVisibility,
): Promise<UpdateQuoteVisibilityResult> {
  const normalizedVisibility = normalizeQuoteVisibility(visibility);
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const existing = await getQuoteRow(db, quoteId, organization.id);

  if (!existing) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  const previousVisibility = resolveQuoteVisibility(existing);
  const now = new Date().toISOString();
  const payload =
    normalizedVisibility === "active"
      ? {
          archived_at: null,
          archived_by_clerk_user_id: null,
          deleted_at: null,
          deleted_by_clerk_user_id: null,
          updated_at: now,
        }
      : {
          archived_at: now,
          archived_by_clerk_user_id: quoter.clerkUserId,
          deleted_at: null,
          deleted_by_clerk_user_id: null,
          updated_at: now,
        };

  const { error } = await db
    .from("quotes")
    .update(payload)
    .eq("id", quoteId)
    .eq("organization_id", organization.id);

  throwIfError(error, "Update quote visibility");

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: quoteVisibilityAuditEvent(normalizedVisibility),
    metadata: {
      previousVisibility,
      visibility: normalizedVisibility,
    },
  });

  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  return { ok: true, quote };
}

export async function deleteSupabaseQuote(
  quoter: QuoterContext,
  quoteId: string,
): Promise<DeleteQuoteResult> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const existing = await getQuoteRow(db, quoteId, organization.id);

  if (!existing) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  if (resolveQuoteVisibility(existing) !== "archived") {
    return { ok: false, code: "QUOTE_NOT_ARCHIVED" };
  }

  await deleteQuoteChildRows(db, quoteId);

  const { data, error } = await db
    .from("quotes")
    .delete()
    .eq("id", quoteId)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  throwIfError(error, "Delete quote");

  return data
    ? { ok: true, quoteId }
    : { ok: false, code: "QUOTE_NOT_FOUND" };
}

export async function sendSupabaseQuote(
  quoter: QuoterContext,
  quoteId: string,
): Promise<SendQuoteResult> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  if (quote.status === "locked") {
    return { ok: false, code: "QUOTE_LOCKED" };
  }

  if (
    quote.lineItems.length === 0 ||
    quote.signatureFields.length === 0 ||
    !quote.quoterPrintedName?.trim() ||
    !quote.quoterSignatureAsset
  ) {
    return { ok: false, code: "QUOTE_NOT_SENDABLE" };
  }

  const versionNumber = await nextVersionNumber(db, quote.id);
  const sentAt = new Date().toISOString();
  const template = await getQuoteTemplateContent(db, organization.id);
  const templateSnapshot = quote.templateSnapshot ?? template;
  if (!quote.templateSnapshot) {
    const { error: templateSnapshotError } = await db
      .from("quotes")
      .update({ template_snapshot: templateSnapshot })
      .eq("id", quote.id)
      .eq("organization_id", organization.id);
    throwIfError(templateSnapshotError, "Freeze quote template snapshot");
    quote.templateSnapshot = templateSnapshot;
  }
  quote.sentAt = sentAt;
  const snapshot = createVersionSnapshot(quote, template);
  const versionId = randomUUID();
  const version: QuoteVersion = {
    id: versionId,
    quoteId: quote.id,
    versionNumber,
    snapshot,
    snapshotSha256: hashSnapshot(snapshot),
    createdByClerkUserId: quoter.clerkUserId,
    createdAt: new Date().toISOString(),
  };

  const { error: versionError } = await db.from("quote_versions").insert({
    id: version.id,
    quote_id: version.quoteId,
    version_number: version.versionNumber,
    snapshot: version.snapshot,
    snapshot_sha256: version.snapshotSha256,
    created_by_clerk_user_id: version.createdByClerkUserId,
    created_at: version.createdAt,
  });

  throwIfError(versionError, "Create quote version");

  await Promise.all(
    quote.recipients.map(async (recipient) => {
      const tokenPayload =
        recipient.accessToken || recipient.shareLinkIssued
          ? {}
          : createRecipientTokenPayload();

      const { error } = await db
        .from("quote_recipients")
        .update({
          quote_version_id: version.id,
          status: "pending",
          ...tokenPayload,
          access_token_expires_at: null,
          viewed_at: null,
          signed_at: null,
          accepted_at: null,
          rejected_at: null,
          locked_at: null,
        })
        .eq("id", recipient.id)
        .eq("quote_id", quote.id);

      throwIfError(error, "Ensure recipient token");
    }),
  );

  const { error: fieldsError } = await db
    .from("signature_fields")
    .update({ quote_version_id: version.id })
    .eq("quote_id", quote.id);

  throwIfError(fieldsError, "Attach signature fields to version");

  const { error: quoteError } = await db
    .from("quotes")
    .update({
      status: "sent",
      sent_at: sentAt,
      locked_at: null,
      current_version: version.versionNumber,
      updated_at: sentAt,
    })
    .eq("id", quote.id)
    .eq("organization_id", organization.id);

  throwIfError(quoteError, "Mark quote sent");

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId: quote.id,
    quoteVersionId: version.id,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: "quote.sent",
    metadata: {
      versionNumber: version.versionNumber,
      recipientCount: quote.recipients.length,
    },
  });

  const sentQuote = await loadQuote(db, quote.id, organization.id);

  if (!sentQuote) {
    throw new Error("Sent quote could not be loaded.");
  }

  return {
    ok: true,
    quote: sentQuote,
    version,
    shareLinks: buildQuoteShareLinks(sentQuote),
    unavailableShareLinks: buildUnavailableQuoteShareLinks(sentQuote),
  };
}

function createRecipientTokenPayload() {
  const token = createClientAccessToken();

  return {
    access_token: token,
    access_token_hash: hashClientAccessToken(token),
  };
}

export async function ensureSupabaseQuoteShareLinks(
  quoter: QuoterContext,
  quoteId: string,
): Promise<EnsureQuoteShareLinksResult> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  if (quote.status === "locked") {
    return { ok: false, code: "QUOTE_LOCKED" };
  }

  const version = await getLatestVersion(db, quote.id);

  if (
    !isQuoteShareable(quote.status) ||
    !version ||
    quote.recipients.length === 0
  ) {
    return { ok: false, code: "QUOTE_NOT_SHAREABLE" };
  }

  let createdCount = 0;
  let returnedCount = 0;
  let unavailableCount = 0;
  let changedRecipients = false;

  await Promise.all(
    quote.recipients.map(async (recipient) => {
      if (recipient.accessToken) {
        returnedCount += 1;

        if (!recipient.accessTokenExpiresAt) {
          return;
        }

        changedRecipients = true;
        const { error } = await db
          .from("quote_recipients")
          .update({ access_token_expires_at: null })
          .eq("id", recipient.id)
          .eq("quote_id", quote.id);

        throwIfError(error, "Clear recipient share token expiry");
        return;
      }

      if (recipient.shareLinkIssued) {
        unavailableCount += 1;

        if (!recipient.accessTokenExpiresAt) {
          return;
        }

        changedRecipients = true;
        const { error } = await db
          .from("quote_recipients")
          .update({ access_token_expires_at: null })
          .eq("id", recipient.id)
          .eq("quote_id", quote.id);

        throwIfError(error, "Clear legacy recipient token expiry");
        return;
      }

      const token = createClientAccessToken();
      createdCount += 1;
      changedRecipients = true;

      const { error } = await db
        .from("quote_recipients")
        .update({
          access_token: token,
          access_token_hash: hashClientAccessToken(token),
          access_token_expires_at: null,
        })
        .eq("id", recipient.id)
        .eq("quote_id", quote.id);

      throwIfError(error, "Create stable recipient share token");
    }),
  );

  if (changedRecipients) {
    const updatedAt = new Date().toISOString();
    const { error: quoteError } = await db
      .from("quotes")
      .update({ updated_at: updatedAt })
      .eq("id", quote.id)
      .eq("organization_id", organization.id);

    throwIfError(quoteError, "Mark quote share links ensured");
  }

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId: quote.id,
    quoteVersionId: version.id,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: "quote.share_links.ensured",
    metadata: {
      recipientCount: quote.recipients.length,
      createdCount,
      returnedCount,
      unavailableCount,
    },
  });

  const ensuredQuote = await loadQuote(db, quote.id, organization.id);

  if (!ensuredQuote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  return {
    ok: true,
    quote: ensuredQuote,
    shareLinks: buildQuoteShareLinks(ensuredQuote),
    unavailableShareLinks: buildUnavailableQuoteShareLinks(ensuredQuote),
    createdCount,
    returnedCount,
    unavailableCount,
  };
}

export async function getSupabaseClientQuoteView(token: string) {
  const db = createSupabaseAdminClient();
  const match = await findRecipientByToken(db, token);

  if (!match) {
    return null;
  }

  const { quoteRow, recipientRow } = match;
  const version = await getLatestVersion(db, quoteRow.id);

  if (!version) {
    return null;
  }

  let recipient = recipientRow;

  if (recipient.status === "pending") {
    const viewedAt = new Date().toISOString();
    const { error } = await db
      .from("quote_recipients")
      .update({
        status: "viewed",
        viewed_at: viewedAt,
      })
      .eq("id", recipient.id);

    throwIfError(error, "Mark recipient viewed");

    recipient = {
      ...recipient,
      status: "viewed",
      viewed_at: viewedAt,
    };

    await updateQuoteAggregateStatus(db, quoteRow.id, quoteRow.organization_id);
    await appendAuditEvent(db, {
      organizationId: quoteRow.organization_id,
      quoteId: quoteRow.id,
      quoteVersionId: version.id,
      actorType: "client",
      actorRef: recipient.id,
      eventType: "quote.viewed",
    });
  }

  const quote = await loadQuote(db, quoteRow.id, quoteRow.organization_id);

  if (!quote) {
    return null;
  }

  return buildClientView(db, quote, version, mapRecipientRow(recipient));
}

export async function placeSupabaseSignature(input: {
  token: string;
  signatureFieldId: string;
  imageBase64: string;
  sourceMethod: SourceMethod;
  ipAddress?: string;
  userAgent?: string;
}): Promise<PlaceSignatureResult> {
  const db = createSupabaseAdminClient();
  const match = await findRecipientByToken(db, input.token);

  if (!match) {
    return { ok: false, code: "TOKEN_INVALID" };
  }

  const { quoteRow, recipientRow } = match;

  if (recipientRow.locked_at || recipientRow.status === "accepted") {
    return { ok: false, code: "RECIPIENT_LOCKED" };
  }

  const version = await getLatestVersion(db, quoteRow.id);

  if (!version) {
    return { ok: false, code: "SIGNATURE_REQUIRED" };
  }

  const field = version.snapshot.signatureFields.find(
    (signatureField) =>
      signatureField.id === input.signatureFieldId &&
      signatureField.recipientId === recipientRow.id,
  );

  if (!field) {
    return { ok: false, code: "SIGNATURE_REQUIRED" };
  }

  const bytes = dataUrlToBuffer(input.imageBase64);
  const signatureAssetId = randomUUID();
  const storagePath = signatureStoragePath({
    organizationId: quoteRow.organization_id,
    ownerType: "client",
    ownerRef: recipientRow.id,
    signatureAssetId,
  });
  const objectPath = stripBucketPrefix(storagePath, SIGNATURE_BUCKET);
  const { error: uploadError } = await db.storage
    .from(SIGNATURE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: "image/png",
      upsert: false,
    });

  throwIfError(uploadError, "Upload signature asset");

  const assetRow: SignatureAssetRow = {
    id: signatureAssetId,
    organization_id: quoteRow.organization_id,
    owner_type: "client",
    owner_ref: recipientRow.id,
    storage_path: storagePath,
    mime_type: "image/png",
    width_px: null,
    height_px: null,
    image_sha256: hashImageBytes(bytes),
    source_method: input.sourceMethod,
    created_at: new Date().toISOString(),
  };

  const { error: assetError } = await db.from("signature_assets").insert({
    id: assetRow.id,
    organization_id: assetRow.organization_id,
    owner_type: assetRow.owner_type,
    owner_ref: assetRow.owner_ref,
    storage_path: assetRow.storage_path,
    mime_type: assetRow.mime_type,
    width_px: assetRow.width_px,
    height_px: assetRow.height_px,
    image_sha256: assetRow.image_sha256,
    source_method: assetRow.source_method,
    created_at: assetRow.created_at,
  });

  throwIfError(assetError, "Create signature asset");

  const placementRow: SignaturePlacementRow = {
    id: randomUUID(),
    quote_id: quoteRow.id,
    quote_version_id: version.id,
    signature_field_id: field.id,
    recipient_id: recipientRow.id,
    signature_asset_id: assetRow.id,
    placed_at: new Date().toISOString(),
  };

  const { error: deletePlacementError } = await db
    .from("signature_placements")
    .delete()
    .eq("quote_version_id", version.id)
    .eq("signature_field_id", field.id)
    .eq("recipient_id", recipientRow.id);

  throwIfError(deletePlacementError, "Replace signature placement");

  const { error: placementError } = await db
    .from("signature_placements")
    .insert({
      id: placementRow.id,
      quote_id: placementRow.quote_id,
      quote_version_id: placementRow.quote_version_id,
      signature_field_id: placementRow.signature_field_id,
      recipient_id: placementRow.recipient_id,
      signature_asset_id: placementRow.signature_asset_id,
      placed_at: placementRow.placed_at,
    });

  throwIfError(placementError, "Create signature placement");

  const recipientStatus = await areRequiredFieldsSigned(
    db,
    version,
    recipientRow.id,
  )
    ? "signed"
    : "viewed";

  const { error: recipientError } = await db
    .from("quote_recipients")
    .update({
      status: recipientStatus,
      signed_at: recipientStatus === "signed" ? placementRow.placed_at : null,
    })
    .eq("id", recipientRow.id);

  throwIfError(recipientError, "Mark recipient signed");

  await updateQuoteAggregateStatus(db, quoteRow.id, quoteRow.organization_id);
  await appendAuditEvent(db, {
    organizationId: quoteRow.organization_id,
    quoteId: quoteRow.id,
    quoteVersionId: version.id,
    actorType: "client",
    actorRef: recipientRow.id,
    eventType: "signature.placed",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      signatureFieldId: field.id,
      sourceMethod: input.sourceMethod,
    },
  });

  return {
    ok: true,
    asset: await mapSignatureAssetRow(db, assetRow),
    placement: mapSignaturePlacementRow(placementRow),
  };
}

export async function updateSupabaseQuoteQuoterSignature(
  quoter: QuoterContext,
  input: {
    quoteId: string;
    imageBase64: string;
    sourceMethod: SourceMethod;
  },
): Promise<UpdateQuoterSignatureResult> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const quote = await loadQuote(db, input.quoteId, organization.id);

  if (!quote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  if (quote.status === "locked") {
    return { ok: false, code: "QUOTE_LOCKED" };
  }

  const bytes = dataUrlToBuffer(input.imageBase64);
  const signatureAssetId = randomUUID();
  const storagePath = signatureStoragePath({
    organizationId: organization.id,
    ownerType: "quoter",
    ownerRef: quote.id,
    signatureAssetId,
  });
  const objectPath = stripBucketPrefix(storagePath, SIGNATURE_BUCKET);
  const { error: uploadError } = await db.storage
    .from(SIGNATURE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: "image/png",
      upsert: false,
    });

  throwIfError(uploadError, "Upload quoter signature asset");

  const assetRow: SignatureAssetRow = {
    id: signatureAssetId,
    organization_id: organization.id,
    owner_type: "quoter",
    owner_ref: quote.id,
    storage_path: storagePath,
    mime_type: "image/png",
    width_px: null,
    height_px: null,
    image_sha256: hashImageBytes(bytes),
    source_method: input.sourceMethod,
    created_at: new Date().toISOString(),
  };

  const { error: assetError } = await db.from("signature_assets").insert({
    id: assetRow.id,
    organization_id: assetRow.organization_id,
    owner_type: assetRow.owner_type,
    owner_ref: assetRow.owner_ref,
    storage_path: assetRow.storage_path,
    mime_type: assetRow.mime_type,
    width_px: assetRow.width_px,
    height_px: assetRow.height_px,
    image_sha256: assetRow.image_sha256,
    source_method: assetRow.source_method,
    created_at: assetRow.created_at,
  });

  throwIfError(assetError, "Create quoter signature asset");

  const { error: quoteError } = await db
    .from("quotes")
    .update({
      quoter_signature_asset_id: assetRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quote.id)
    .eq("organization_id", organization.id);

  throwIfError(quoteError, "Attach quoter signature");

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId: quote.id,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: "quote.quoter_signature.updated",
    metadata: {
      sourceMethod: input.sourceMethod,
      signatureAssetId: assetRow.id,
    },
  });

  const updatedQuote = await loadQuote(db, quote.id, organization.id);

  if (!updatedQuote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  return { ok: true, quote: updatedQuote };
}

export async function deleteSupabaseQuoteQuoterSignature(
  quoter: QuoterContext,
  quoteId: string,
): Promise<UpdateQuoterSignatureResult> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  if (quote.status === "locked") {
    return { ok: false, code: "QUOTE_LOCKED" };
  }

  const { error } = await db
    .from("quotes")
    .update({
      quoter_signature_asset_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quote.id)
    .eq("organization_id", organization.id);

  throwIfError(error, "Remove quoter signature");

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId: quote.id,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: "quote.quoter_signature.deleted",
  });

  const updatedQuote = await loadQuote(db, quote.id, organization.id);

  if (!updatedQuote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  return { ok: true, quote: updatedQuote };
}

export async function acceptSupabaseQuote(input: {
  token: string;
  typedName: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AcceptQuoteResult> {
  const db = createSupabaseAdminClient();
  const match = await findRecipientByToken(db, input.token);

  if (!match) {
    return { ok: false, code: "TOKEN_INVALID" };
  }

  const { quoteRow, recipientRow } = match;

  if (recipientRow.locked_at || recipientRow.status === "accepted") {
    return { ok: false, code: "RECIPIENT_LOCKED" };
  }

  const version = await getLatestVersion(db, quoteRow.id);

  if (!version) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  const signed = await areRequiredFieldsSigned(db, version, recipientRow.id);

  if (!signed) {
    return { ok: false, code: "SIGNATURE_REQUIRED" };
  }

  const acceptedAt = new Date().toISOString();
  const { error: recipientError } = await db
    .from("quote_recipients")
    .update({
      status: "accepted",
      accepted_at: acceptedAt,
      locked_at: acceptedAt,
    })
    .eq("id", recipientRow.id);

  throwIfError(recipientError, "Accept quote");

  const quoteStatus = await updateQuoteAggregateStatus(
    db,
    quoteRow.id,
    quoteRow.organization_id,
  );

  await appendAuditEvent(db, {
    organizationId: quoteRow.organization_id,
    quoteId: quoteRow.id,
    quoteVersionId: version.id,
    actorType: "client",
    actorRef: recipientRow.id,
    eventType: "quote.accepted",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      typedName: input.typedName,
      versionNumber: version.versionNumber,
    },
  });

  if (quoteStatus === "locked") {
    await appendAuditEvent(db, {
      organizationId: quoteRow.organization_id,
      quoteId: quoteRow.id,
      quoteVersionId: version.id,
      actorType: "system",
      actorRef: "system",
      eventType: "quote.locked",
    });
  }

  const quote = await loadQuote(db, quoteRow.id, quoteRow.organization_id);

  if (!quote) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  const recipient = quote.recipients.find(
    (candidate) => candidate.id === recipientRow.id,
  );

  if (!recipient) {
    return { ok: false, code: "QUOTE_NOT_FOUND" };
  }

  return {
    ok: true,
    quote,
    recipient,
    acceptedAt,
    locked: Boolean(recipient.lockedAt),
  };
}

export async function listSupabaseQuoteVersions(
  quoter: QuoterContext,
  quoteId: string,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return [];
  }

  return Promise.all(
    (await getQuoteVersions(db, quote.id)).map((version) =>
      withSignedSnapshotLineItemUrls(db, version),
    ),
  );
}

export async function listSupabaseAuditEvents(
  quoter: QuoterContext,
  quoteId: string,
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return [];
  }

  const { data, error } = await db
    .from("audit_events")
    .select("*")
    .eq("quote_id", quote.id)
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  throwIfError(error, "List audit events");

  return ((data ?? []) as AuditEventRow[]).map(mapAuditEventRow);
}

export async function createSupabasePdfExport(
  quoter: QuoterContext,
  quoteId: string,
): Promise<PdfExportResult | null> {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const quote = await loadQuote(db, quoteId, organization.id);

  if (!quote) {
    return null;
  }

  const version = await getLatestVersion(db, quote.id);

  if (!version) {
    return null;
  }

  const rendered = await renderQuotePdf({
    quoteId: quote.id,
    quoteVersionId: version.id,
    requestedByClerkUserId: quoter.clerkUserId,
  });
  const pdfExportId = randomUUID();
  const storagePath = pdfStoragePath({
    organizationId: organization.id,
    quoteId: quote.id,
    versionNumber: version.versionNumber,
    pdfExportId,
  });
  const objectPath = stripBucketPrefix(storagePath, PDF_BUCKET);
  const { error: uploadError } = await db.storage
    .from(PDF_BUCKET)
    .upload(objectPath, rendered.bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  throwIfError(uploadError, "Upload quote PDF");

  const { error: exportError } = await db.from("pdf_exports").insert({
    id: pdfExportId,
    quote_id: quote.id,
    quote_version_id: version.id,
    storage_path: storagePath,
    pdf_sha256: rendered.sha256,
    generated_by_clerk_user_id: quoter.clerkUserId,
    generated_at: new Date().toISOString(),
  });

  throwIfError(exportError, "Create PDF export");

  await appendAuditEvent(db, {
    organizationId: organization.id,
    quoteId: quote.id,
    quoteVersionId: version.id,
    actorType: "quoter",
    actorRef: quoter.clerkUserId,
    eventType: "pdf.exported",
    metadata: {
      pdfExportId,
      versionNumber: version.versionNumber,
    },
  });

  const { data: signedUrl, error: signedUrlError } = await db.storage
    .from(PDF_BUCKET)
    .createSignedUrl(objectPath, 300);

  throwIfError(signedUrlError, "Create PDF signed URL");

  if (!signedUrl) {
    throw new Error("Create PDF signed URL failed: no URL was returned.");
  }

  return {
    exportRecord: {
      pdfExportId,
      downloadUrl: signedUrl.signedUrl,
      expiresInSeconds: 300,
    },
    version,
    sha256: rendered.sha256,
  };
}

async function ensureWorkspace(
  db: SupabaseClient,
  quoter: QuoterContext,
): Promise<OrganizationRow> {
  const workspaceRef = quoter.organizationId;
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("organizations")
    .upsert(
      {
        clerk_org_id: workspaceRef,
        name: workspaceRef.startsWith("personal:")
          ? "Personal Workspace"
          : "Clerk Organization",
        updated_at: now,
      },
      { onConflict: "clerk_org_id" },
    )
    .select("id, clerk_org_id, name")
    .single();

  throwIfError(error, "Ensure organization");

  const organization = data as OrganizationRow;
  const { error: membershipError } = await db
    .from("organization_members")
    .upsert(
      {
        organization_id: organization.id,
        clerk_user_id: quoter.clerkUserId,
        role: "owner",
      },
      { onConflict: "organization_id,clerk_user_id" },
    );

  throwIfError(membershipError, "Ensure organization membership");

  return organization;
}

async function getQuoteTemplateContent(
  db: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await db
    .from("quote_templates")
    .select("content")
    .eq("organization_id", organizationId)
    .maybeSingle();

  throwIfError(error, "Get quote template");

  return mergeQuoteTemplate(
    (data as Pick<QuoteTemplateRow, "content"> | null)?.content,
  );
}

async function upsertClient(
  db: SupabaseClient,
  organizationId: string,
  client: ClientInput,
  existingClientId?: string,
) {
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(client.email);
  const payload = {
    organization_id: organizationId,
    company_name: emptyToNull(client.companyName),
    contact_name: client.contactName,
    email: emptyToNull(normalizedEmail),
    phone: emptyToNull(client.phone),
    billing_address: emptyToNull(client.address)
      ? { value: client.address?.trim() }
      : null,
    updated_at: now,
  };

  if (normalizedEmail) {
    const { data: existingByEmail, error: existingByEmailError } = await db
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    throwIfError(existingByEmailError, "Find client by email");

    if (existingByEmail) {
      const { data, error } = await db
        .from("clients")
        .update(payload)
        .eq("id", (existingByEmail as ClientRow).id)
        .eq("organization_id", organizationId)
        .select("*")
        .single();

      throwIfError(error, "Update client by email");
      return data as ClientRow;
    }
  }

  if (existingClientId) {
    const { data, error } = await db
      .from("clients")
      .update(payload)
      .eq("id", existingClientId)
      .eq("organization_id", organizationId)
      .select("*")
      .maybeSingle();

    throwIfError(error, "Update existing client");

    if (data) {
      return data as ClientRow;
    }
  }

  const { data, error } = await db
    .from("clients")
    .insert({
      ...payload,
      created_at: now,
    })
    .select("*")
    .single();

  throwIfError(error, "Create client");

  return data as ClientRow;
}

async function loadQuote(
  db: SupabaseClient,
  quoteId: string,
  organizationId: string,
  knownQuoteRow?: QuoteRow,
): Promise<Quote | null> {
  const quoteRow = knownQuoteRow ?? (await getQuoteRow(db, quoteId, organizationId));

  if (!quoteRow) {
    return null;
  }

  const [lineItems, recipients, signatureFields] = await Promise.all([
    getLineItemRows(db, quoteRow.id),
    getRecipientRows(db, quoteRow.id),
    getSignatureFieldRows(db, quoteRow.id),
  ]);
  const client = await getQuoteClient(db, organizationId, recipients);
  const mappedLineItems = await Promise.all(
    lineItems.map((lineItem) => mapLineItemRow(db, lineItem)),
  );
  const quoterSignatureAsset = quoteRow.quoter_signature_asset_id
    ? await getSignatureAssetById(db, quoteRow.quoter_signature_asset_id)
    : null;

  return {
    id: quoteRow.id,
    organizationId: quoteRow.organization_id,
    visibility: resolveQuoteVisibility(quoteRow),
    quoteNumber: quoteRow.quote_number,
    quotationName: quoteRow.quotation_name,
    title: quoteRow.title,
    status: quoteRow.status,
    currency: normalizeCurrency(quoteRow.currency),
    subtotalMinor: Number(quoteRow.subtotal_minor),
    discountMinor: Number(quoteRow.discount_minor),
    taxMinor: Number(quoteRow.tax_minor),
    totalMinor: Number(quoteRow.total_minor),
    client,
    lineItems: mappedLineItems,
    recipients: recipients.map(mapRecipientRow),
    signatureFields: signatureFields.map(mapSignatureFieldRow),
    currentVersion: quoteRow.current_version,
    createdByClerkUserId: quoteRow.created_by_clerk_user_id,
    validUntil: quoteRow.valid_until ?? undefined,
    requestSummary: quoteRow.request_summary ?? undefined,
    terms: quoteRow.terms ?? undefined,
    notes: quoteRow.notes ?? undefined,
    templateSnapshot: quoteRow.template_snapshot
      ? mergeQuoteTemplate(quoteRow.template_snapshot)
      : undefined,
    quoterPrintedName: quoteRow.quoter_printed_name ?? undefined,
    quoterSignatureAsset,
    sentAt: quoteRow.sent_at ?? undefined,
    lockedAt: quoteRow.locked_at ?? undefined,
    archivedAt: quoteRow.archived_at ?? undefined,
    archivedByClerkUserId: quoteRow.archived_by_clerk_user_id ?? undefined,
    deletedAt: quoteRow.deleted_at ?? undefined,
    deletedByClerkUserId: quoteRow.deleted_by_clerk_user_id ?? undefined,
    createdAt: quoteRow.created_at,
    updatedAt: quoteRow.updated_at,
  };
}

async function getQuoteRow(
  db: SupabaseClient,
  quoteId: string,
  organizationId: string,
) {
  const { data, error } = await db
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  throwIfError(error, "Get quote");

  return data as QuoteRow | null;
}

function applyQuoteVisibilityFilter<
  T extends {
    is(column: string, value: null): T;
    not(column: string, operator: string, value: unknown): T;
    or(filters: string): T;
  },
>(
  query: T,
  visibility: QuoteVisibility,
) {
  const normalizedVisibility = normalizeQuoteVisibility(visibility);

  if (normalizedVisibility === "archived") {
    return query.or("archived_at.not.is.null,deleted_at.not.is.null");
  }

  return query.is("archived_at", null).is("deleted_at", null);
}

function resolveQuoteVisibility(
  quote: Pick<QuoteRow, "archived_at" | "deleted_at">,
): QuoteVisibility {
  if (quote.archived_at || quote.deleted_at) {
    return "archived";
  }

  return "active";
}

function quoteVisibilityAuditEvent(visibility: QuoteVisibility) {
  const normalizedVisibility = normalizeQuoteVisibility(visibility);

  if (normalizedVisibility === "active") {
    return "quote.restored";
  }

  return "quote.archived";
}

function normalizeQuoteVisibility(
  visibility: QuoteVisibility,
): QuoteVisibility {
  return visibility === "deleted" ? "archived" : visibility;
}

async function deleteQuoteChildRows(db: SupabaseClient, quoteId: string) {
  const deleteSteps = [
    {
      table: "signature_placements",
      label: "Delete quote signature placements",
    },
    { table: "pdf_exports", label: "Delete quote PDF exports" },
    { table: "signature_fields", label: "Delete quote signature fields" },
    { table: "quote_recipients", label: "Delete quote recipients" },
    { table: "quote_line_items", label: "Delete quote line items" },
    { table: "audit_events", label: "Delete quote audit events" },
    { table: "quote_versions", label: "Delete quote versions" },
  ] as const;

  for (const step of deleteSteps) {
    const { error } = await db
      .from(step.table)
      .delete()
      .eq("quote_id", quoteId);

    throwIfError(error, step.label);
  }
}

async function getLineItemRows(db: SupabaseClient, quoteId: string) {
  const { data, error } = await db
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });

  throwIfError(error, "Get quote line items");

  return (data ?? []) as QuoteLineItemRow[];
}

async function getRecipientRows(db: SupabaseClient, quoteId: string) {
  const { data, error } = await db
    .from("quote_recipients")
    .select("*")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  throwIfError(error, "Get quote recipients");

  return (data ?? []) as QuoteRecipientRow[];
}

async function getSignatureFieldRows(db: SupabaseClient, quoteId: string) {
  const { data, error } = await db
    .from("signature_fields")
    .select("*")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  throwIfError(error, "Get signature fields");

  return (data ?? []) as SignatureFieldRow[];
}

async function getQuoteClient(
  db: SupabaseClient,
  organizationId: string,
  recipients: QuoteRecipientRow[],
): Promise<ClientInput> {
  const clientId = recipients.find((recipient) => recipient.client_id)?.client_id;

  if (!clientId) {
    const fallback = recipients[0];
    return {
      contactName: fallback?.name ?? "",
      email: fallback?.email ?? "",
      address: "",
      phone: "",
    };
  }

  const { data, error } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  throwIfError(error, "Get client");

  const row = data as ClientRow | null;

  if (!row) {
    const fallback = recipients[0];
    return {
      contactName: fallback?.name ?? "",
      email: fallback?.email ?? "",
      address: "",
      phone: "",
    };
  }

  return {
    companyName: row.company_name ?? "",
    contactName: row.contact_name,
    address: row.billing_address?.value ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
  };
}

async function insertLineItems(
  db: SupabaseClient,
  quoteId: string,
  lineItems: QuoteLineItem[],
) {
  const { error } = await db.from("quote_line_items").insert(
    lineItems.map((lineItem) => ({
      id: lineItem.id,
      quote_id: quoteId,
      sort_order: lineItem.sortOrder,
      name: lineItem.name,
      description: lineItem.description ?? null,
      unit: lineItem.unit,
      quantity: lineItem.quantity,
      unit_price_minor: lineItem.unitPriceMinor,
      discount_minor: lineItem.discountMinor,
      tax_rate: lineItem.taxRate,
      line_total_minor: lineItem.lineTotalMinor,
      description_image_storage_path:
        lineItem.descriptionImageStoragePath ?? null,
      description_image_mime_type: lineItem.descriptionImageMimeType ?? null,
    })),
  );

  throwIfError(error, "Insert line items");
}

async function createDefaultRecipientAndField(
  db: SupabaseClient,
  quoteId: string,
  client: ClientRow,
  clientInput: ClientInput,
) {
  const recipientId = randomUUID();
  const dormantToken = createClientAccessToken();
  const { error: recipientError } = await db.from("quote_recipients").insert({
    id: recipientId,
    quote_id: quoteId,
    client_id: client.id,
    name: clientInput.contactName,
    email: normalizeEmail(clientInput.email),
    role: "client",
    status: "pending",
    access_token_hash: hashClientAccessToken(dormantToken),
    access_token_expires_at: defaultTokenExpiry(1),
  });

  throwIfError(recipientError, "Create default recipient");

  const { error: fieldError } = await db.from("signature_fields").insert({
    id: randomUUID(),
    quote_id: quoteId,
    recipient_id: recipientId,
    signer_type: "client",
    label: "Client Signature",
    anchor_key: "client_signature_block_primary",
    required: true,
    width_px: 240,
    height_px: 96,
  });

  throwIfError(fieldError, "Create default signature field");
}

async function nextQuoteNumber(
  db: SupabaseClient,
  organizationId: string,
  format: string,
) {
  const { count, error } = await db
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  throwIfError(error, "Count quotes");

  return formatQuoteNumber(format, (count ?? 0) + 1);
}

async function nextVersionNumber(db: SupabaseClient, quoteId: string) {
  const { data, error } = await db
    .from("quote_versions")
    .select("version_number")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, "Get next version number");

  return Number((data as { version_number?: number } | null)?.version_number ?? 0) + 1;
}

async function getQuoteVersions(db: SupabaseClient, quoteId: string) {
  const { data, error } = await db
    .from("quote_versions")
    .select("*")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: true });

  throwIfError(error, "Get quote versions");

  return ((data ?? []) as QuoteVersionRow[]).map(mapVersionRow);
}

async function getLatestVersion(db: SupabaseClient, quoteId: string) {
  const { data, error } = await db
    .from("quote_versions")
    .select("*")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, "Get latest quote version");

  return data ? mapVersionRow(data as QuoteVersionRow) : null;
}

async function findRecipientByToken(db: SupabaseClient, token: string) {
  const { data: recipientData, error: recipientError } = await db
    .from("quote_recipients")
    .select("*")
    .eq("access_token_hash", hashClientAccessToken(token))
    .maybeSingle();

  throwIfError(recipientError, "Find recipient token");

  const recipientRow = recipientData as QuoteRecipientRow | null;

  if (!recipientRow) {
    return null;
  }

  if (
    recipientRow.access_token_expires_at &&
    new Date(recipientRow.access_token_expires_at) < new Date()
  ) {
    return null;
  }

  const { data: quoteData, error: quoteError } = await db
    .from("quotes")
    .select("*")
    .eq("id", recipientRow.quote_id)
    .maybeSingle();

  throwIfError(quoteError, "Find token quote");

  const quoteRow = quoteData as QuoteRow | null;

  return quoteRow ? { quoteRow, recipientRow } : null;
}

async function updateQuoteAggregateStatus(
  db: SupabaseClient,
  quoteId: string,
  organizationId: string,
) {
  const recipients = await getRecipientRows(db, quoteId);
  const status = getAggregateQuoteStatus({
    recipients: recipients.map(mapRecipientRow),
  });
  const lockedAt = status === "locked" ? new Date().toISOString() : null;
  const { error } = await db
    .from("quotes")
    .update({
      status,
      locked_at: lockedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .eq("organization_id", organizationId);

  throwIfError(error, "Update quote aggregate status");

  return status;
}

async function areRequiredFieldsSigned(
  db: SupabaseClient,
  version: QuoteVersion,
  recipientId: string,
) {
  const requiredFields = version.snapshot.signatureFields.filter(
    (field) => field.recipientId === recipientId && field.required,
  );

  if (requiredFields.length === 0) {
    return true;
  }

  const { data, error } = await db
    .from("signature_placements")
    .select("signature_field_id")
    .eq("quote_version_id", version.id)
    .eq("recipient_id", recipientId);

  throwIfError(error, "Check required signatures");

  const signedFieldIds = new Set(
    ((data ?? []) as { signature_field_id: string }[]).map(
      (placement) => placement.signature_field_id,
    ),
  );

  return requiredFields.every((field) => signedFieldIds.has(field.id));
}

async function buildClientView(
  db: SupabaseClient,
  quote: Quote,
  version: QuoteVersion,
  recipient: QuoteRecipient,
): Promise<ClientQuoteView> {
  const { data: placementData, error: placementError } = await db
    .from("signature_placements")
    .select("*")
    .eq("quote_version_id", version.id)
    .eq("recipient_id", recipient.id);

  throwIfError(placementError, "Get signature placements");

  const placementRows = (placementData ?? []) as SignaturePlacementRow[];
  const placements = placementRows.map(mapSignaturePlacementRow);
  const assetRows = await getSignatureAssets(
    db,
    placementRows.map((placement) => placement.signature_asset_id),
  );
  const assets = new Map(
    await Promise.all(
      assetRows.map(async (asset) => {
        const mapped = await mapSignatureAssetRow(db, asset);
        return [asset.id, mapped] as const;
      }),
    ),
  );
  const signedVersion = await withSignedSnapshotLineItemUrls(db, version);

  return {
    quoteId: quote.id,
    versionNumber: version.versionNumber,
    recipient: {
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      status: recipient.status,
      acceptedAt: recipient.acceptedAt,
      lockedAt: recipient.lockedAt,
    },
    quote: signedVersion.snapshot,
    requiredSignatureFields: signedVersion.snapshot.signatureFields
      .filter((field) => field.recipientId === recipient.id)
      .map((field) => {
        const placement = placements.find(
          (candidate) => candidate.signatureFieldId === field.id,
        );

        return {
          ...field,
          status: placement ? ("signed" as const) : ("unsigned" as const),
          placement,
          signatureAsset: placement
            ? assets.get(placement.signatureAssetId)
            : undefined,
        };
      }),
    placements,
  };
}

async function getSignatureAssets(db: SupabaseClient, assetIds: string[]) {
  if (assetIds.length === 0) {
    return [];
  }

  const { data, error } = await db
    .from("signature_assets")
    .select("*")
    .in("id", assetIds);

  throwIfError(error, "Get signature assets");

  return (data ?? []) as SignatureAssetRow[];
}

async function getSignatureAssetById(
  db: SupabaseClient,
  assetId: string,
): Promise<SignatureAsset | null> {
  const asset = (await getSignatureAssets(db, [assetId]))[0];

  if (!asset) {
    return null;
  }

  return mapSignatureAssetRow(db, asset);
}

async function mapSignatureAssetRow(
  db: SupabaseClient,
  row: SignatureAssetRow,
): Promise<SignatureAsset> {
  const { data, error } = await db.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(stripBucketPrefix(row.storage_path, SIGNATURE_BUCKET), 300);

  throwIfError(error, "Create signature signed URL");

  if (!data) {
    throw new Error("Create signature signed URL failed: no URL was returned.");
  }

  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerRef: row.owner_ref,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    widthPx: row.width_px ?? undefined,
    heightPx: row.height_px ?? undefined,
    imageSha256: row.image_sha256,
    sourceMethod: row.source_method,
    dataUrl: data.signedUrl,
    createdAt: row.created_at,
  };
}

async function appendAuditEvent(
  db: SupabaseClient,
  input: {
    organizationId: string;
    quoteId: string;
    quoteVersionId?: string;
    actorType: "quoter" | "client" | "system";
    actorRef?: string;
    eventType: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await db.from("audit_events").insert({
    organization_id: input.organizationId,
    quote_id: input.quoteId,
    quote_version_id: input.quoteVersionId ?? null,
    actor_type: input.actorType,
    actor_ref: input.actorRef ?? null,
    event_type: input.eventType,
    ip_address: normalizeIpAddress(input.ipAddress),
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });

  throwIfError(error, "Create audit event");
}

function normalizeLineItems(
  lineItems: QuoteDraft["lineItems"],
  template: QuoteTemplate,
): QuoteLineItem[] {
  const vatEnabled = template.lineItems.vat.enabled;
  const taxMode = getTemplateTaxMode(template);

  return withCalculatedLineTotals(
    lineItems.map((lineItem, index) => ({
      id: randomUUID(),
      sortOrder: index + 1,
      name: lineItem.name,
      description: emptyToUndefined(lineItem.description),
      unit: lineItem.unit || "Unit",
      quantity: lineItem.quantity,
      unitPriceMinor: lineItem.unitPriceMinor,
      discountMinor: lineItem.discountMinor,
      taxRate: vatEnabled ? lineItem.taxRate : 0,
      descriptionImageStoragePath: emptyToUndefined(
        lineItem.descriptionImageStoragePath,
      ),
      descriptionImageMimeType: lineItem.descriptionImageMimeType,
    })),
    taxMode,
  );
}

async function mapLineItemRow(
  db: SupabaseClient,
  row: QuoteLineItemRow,
): Promise<QuoteLineItem> {
  const descriptionImageStoragePath =
    row.description_image_storage_path ?? undefined;

  return {
    id: row.id,
    sortOrder: row.sort_order,
    name: row.name,
    description: row.description ?? undefined,
    unit: row.unit ?? "Unit",
    quantity: Number(row.quantity),
    unitPriceMinor: Number(row.unit_price_minor),
    discountMinor: Number(row.discount_minor),
    taxRate: Number(row.tax_rate),
    lineTotalMinor: Number(row.line_total_minor),
    descriptionImageStoragePath,
    descriptionImageMimeType: row.description_image_mime_type ?? undefined,
    descriptionImageUrl: descriptionImageStoragePath
      ? await createStorageSignedUrl(
          db,
          LINE_ITEM_IMAGE_BUCKET,
          descriptionImageStoragePath,
        )
      : undefined,
  };
}

function mapRecipientRow(row: QuoteRecipientRow): QuoteRecipient {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    accessToken: row.access_token ?? undefined,
    accessTokenExpiresAt: row.access_token_expires_at ?? undefined,
    shareLinkIssued: Boolean(row.access_token || row.quote_version_id),
    viewedAt: row.viewed_at ?? undefined,
    signedAt: row.signed_at ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    lockedAt: row.locked_at ?? undefined,
  };
}

function mapSignatureFieldRow(row: SignatureFieldRow): SignatureField {
  return {
    id: row.id,
    recipientId: row.recipient_id ?? undefined,
    signerType: row.signer_type,
    label: row.label,
    anchorKey: row.anchor_key,
    required: row.required,
    widthPx: row.width_px,
    heightPx: row.height_px,
  };
}

function mapVersionRow(row: QuoteVersionRow): QuoteVersion {
  return {
    id: row.id,
    quoteId: row.quote_id,
    versionNumber: row.version_number,
    snapshot: row.snapshot,
    snapshotSha256: row.snapshot_sha256,
    createdByClerkUserId: row.created_by_clerk_user_id,
    createdAt: row.created_at,
  };
}

async function withSignedSnapshotLineItemUrls(
  db: SupabaseClient,
  version: QuoteVersion,
): Promise<QuoteVersion> {
  const quoterSignatureAsset =
    version.snapshot.quoterSignature?.asset?.storagePath
      ? await mapSignatureAssetRow(db, {
          id: version.snapshot.quoterSignature.asset.id,
          organization_id: null,
          owner_type: version.snapshot.quoterSignature.asset.ownerType,
          owner_ref: version.snapshot.quoterSignature.asset.ownerRef,
          storage_path: version.snapshot.quoterSignature.asset.storagePath,
          mime_type: version.snapshot.quoterSignature.asset.mimeType,
          width_px: version.snapshot.quoterSignature.asset.widthPx ?? null,
          height_px: version.snapshot.quoterSignature.asset.heightPx ?? null,
          image_sha256: version.snapshot.quoterSignature.asset.imageSha256,
          source_method: version.snapshot.quoterSignature.asset.sourceMethod,
          created_at: version.snapshot.quoterSignature.asset.createdAt,
        })
      : version.snapshot.quoterSignature?.asset;

  return {
    ...version,
    snapshot: {
      ...version.snapshot,
      lineItems: await Promise.all(
        version.snapshot.lineItems.map(async (lineItem) => ({
          ...lineItem,
          unit: lineItem.unit || "Unit",
          descriptionImageUrl: lineItem.descriptionImageStoragePath
            ? await createStorageSignedUrl(
                db,
                LINE_ITEM_IMAGE_BUCKET,
                lineItem.descriptionImageStoragePath,
              )
            : undefined,
        })),
      ),
      quoterSignature: version.snapshot.quoterSignature
        ? {
            ...version.snapshot.quoterSignature,
            asset: quoterSignatureAsset,
          }
        : undefined,
    },
  };
}

async function mapLineItemDataRow(
  db: SupabaseClient,
  row: LineItemDataRow,
): Promise<LineItemData> {
  const descriptionImageStoragePath =
    row.description_image_storage_path ?? undefined;

  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    detailedDescription: row.detailed_description,
    unit: row.unit,
    unitPriceMinor: Number(row.unit_price_minor),
    descriptionImageStoragePath,
    descriptionImageMimeType: row.description_image_mime_type ?? undefined,
    descriptionImageUrl: descriptionImageStoragePath
      ? await createStorageSignedUrl(
          db,
          LINE_ITEM_IMAGE_BUCKET,
          descriptionImageStoragePath,
        )
      : undefined,
    createdByClerkUserId: row.created_by_clerk_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSignaturePlacementRow(
  row: SignaturePlacementRow,
): SignaturePlacement {
  return {
    id: row.id,
    quoteId: row.quote_id,
    quoteVersionId: row.quote_version_id,
    signatureFieldId: row.signature_field_id,
    recipientId: row.recipient_id ?? undefined,
    signatureAssetId: row.signature_asset_id,
    placedAt: row.placed_at,
  };
}

function mapAuditEventRow(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    actorType: row.actor_type,
    actorRef: row.actor_ref ?? undefined,
    eventType: row.event_type,
    ipAddress: row.ip_address ?? undefined,
    userAgent: row.user_agent ?? undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? "";
}

function emptyToUndefined<T extends string | undefined>(value: T) {
  return value?.trim() ? value : undefined;
}

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value : null;
}

function getTemplateTaxMode(template?: QuoteTemplate): TaxMode {
  return template?.lineItems.vat.enabled
    ? template.lineItems.vat.mode
    : "exclusive";
}

function stripBucketPrefix(path: string, bucket: string) {
  return path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
}

async function createStorageSignedUrl(
  db: SupabaseClient,
  bucket: string,
  storagePath: string,
) {
  if (storagePath.startsWith("data:")) {
    return storagePath;
  }

  const objectPath = stripBucketPrefix(storagePath, bucket);
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(objectPath, 300);

  throwIfError(error, "Create storage signed URL");

  return data?.signedUrl;
}

function extensionForMimeType(mimeType: LineItemImageMimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "png";
}

function normalizeIpAddress(value?: string) {
  return value?.split(",")[0]?.trim() || null;
}

function throwIfError(error: SupabaseError | undefined, context: string) {
  if (error) {
    throw new Error(`${context} failed: ${error.message}`);
  }
}
