import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createClientAccessToken,
  defaultTokenExpiry,
  hashClientAccessToken,
} from "@/lib/client-links/token";
import {
  calculateQuoteTotals,
  withCalculatedLineTotals,
} from "@/lib/quotes/calculate-totals";
import {
  createVersionSnapshot,
  hashSnapshot,
} from "@/lib/quotes/create-version-snapshot";
import { getAggregateQuoteStatus } from "@/lib/quotes/quote-state";
import type {
  AuditEvent,
  ClientInput,
  ClientQuoteView,
  Quote,
  QuoteDraft,
  QuoteLineItem,
  QuoteRecipient,
  QuoteStatus,
  QuoteVersion,
  QuoteVersionSnapshot,
  RecipientStatus,
  SignatureAsset,
  SignatureField,
  SignaturePlacement,
  SourceMethod,
} from "@/lib/quotes/types";
import { renderQuotePdf } from "@/lib/pdf/render-pdf";
import { dataUrlToBuffer, hashImageBytes } from "@/lib/signatures/hash-image";
import {
  pdfStoragePath,
  signatureStoragePath,
} from "@/lib/signatures/storage-paths";

const SIGNATURE_BUCKET = "signature-assets";
const PDF_BUCKET = "quote-pdfs";

export type QuoterContext = {
  clerkUserId: string;
  organizationId: string;
};

export type SendQuoteResult =
  | { ok: true; quote: Quote; version: QuoteVersion }
  | { ok: false; code: "QUOTE_NOT_FOUND" | "QUOTE_NOT_SENDABLE" };

export type PlaceSignatureResult =
  | { ok: true; asset: SignatureAsset; placement: SignaturePlacement }
  | {
      ok: false;
      code: "TOKEN_INVALID" | "RECIPIENT_LOCKED" | "SIGNATURE_REQUIRED";
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
  email: string;
  phone: string | null;
};

type QuoteRow = {
  id: string;
  organization_id: string;
  quote_number: string;
  title: string;
  status: QuoteStatus;
  currency: string;
  subtotal_minor: number | string;
  discount_minor: number | string;
  tax_minor: number | string;
  total_minor: number | string;
  valid_until: string | null;
  terms: string | null;
  notes: string | null;
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
  quantity: number | string;
  unit_price_minor: number | string;
  discount_minor: number | string;
  tax_rate: number | string;
  line_total_minor: number | string;
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
  access_token_hash: string;
  access_token_expires_at: string;
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

type SupabaseError = {
  message: string;
  code?: string;
} | null;

export async function listSupabaseQuotes(quoter: QuoterContext) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const { data, error } = await db
    .from("quotes")
    .select("*")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });

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
  const client = await upsertClient(db, organization.id, draft.client);
  const lineItems = normalizeLineItems(draft.lineItems);
  const totals = calculateQuoteTotals(
    lineItems,
    draft.quoteLevelDiscountMinor ?? 0,
  );
  const quoteId = randomUUID();
  const recipientId = randomUUID();
  const signatureFieldId = randomUUID();
  const now = new Date().toISOString();
  const quoteNumber = await nextQuoteNumber(db, organization.id);
  const dormantToken = createClientAccessToken();

  const { error: quoteError } = await db.from("quotes").insert({
    id: quoteId,
    organization_id: organization.id,
    quote_number: quoteNumber,
    title: draft.title,
    status: "draft",
    currency: draft.currency,
    subtotal_minor: totals.subtotalMinor,
    discount_minor: totals.discountMinor,
    tax_minor: totals.taxMinor,
    total_minor: totals.totalMinor,
    valid_until: emptyToNull(draft.validUntil),
    terms: emptyToNull(draft.terms),
    notes: emptyToNull(draft.notes),
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
) {
  const db = createSupabaseAdminClient();
  const organization = await ensureWorkspace(db, quoter);
  const existing = await loadQuote(db, quoteId, organization.id);

  if (!existing) {
    return null;
  }

  const client = await upsertClient(db, organization.id, draft.client);
  const lineItems = normalizeLineItems(draft.lineItems);
  const totals = calculateQuoteTotals(
    lineItems,
    draft.quoteLevelDiscountMinor ?? 0,
  );
  const now = new Date().toISOString();

  const { error: quoteError } = await db
    .from("quotes")
    .update({
      title: draft.title,
      currency: draft.currency,
      subtotal_minor: totals.subtotalMinor,
      discount_minor: totals.discountMinor,
      tax_minor: totals.taxMinor,
      total_minor: totals.totalMinor,
      valid_until: emptyToNull(draft.validUntil),
      terms: emptyToNull(draft.terms),
      notes: emptyToNull(draft.notes),
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

  const existingRecipient = existing.recipients.find(
    (recipient) => recipient.role === "client",
  );

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

  return loadQuote(db, quoteId, organization.id);
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

  if (quote.lineItems.length === 0 || quote.signatureFields.length === 0) {
    return { ok: false, code: "QUOTE_NOT_SENDABLE" };
  }

  const versionNumber = await nextVersionNumber(db, quote.id);
  const snapshot = createVersionSnapshot(quote);
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

  const tokenByRecipientId = new Map<string, string>();
  const expiresAt = defaultTokenExpiry();

  await Promise.all(
    quote.recipients.map(async (recipient) => {
      const token = createClientAccessToken();
      tokenByRecipientId.set(recipient.id, token);
      const { error } = await db
        .from("quote_recipients")
        .update({
          quote_version_id: version.id,
          status: "pending",
          access_token_hash: hashClientAccessToken(token),
          access_token_expires_at: expiresAt,
          viewed_at: null,
          signed_at: null,
          accepted_at: null,
          rejected_at: null,
          locked_at: null,
        })
        .eq("id", recipient.id)
        .eq("quote_id", quote.id);

      throwIfError(error, "Rotate recipient token");
    }),
  );

  const { error: fieldsError } = await db
    .from("signature_fields")
    .update({ quote_version_id: version.id })
    .eq("quote_id", quote.id);

  throwIfError(fieldsError, "Attach signature fields to version");

  const sentAt = new Date().toISOString();
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

  sentQuote.recipients = sentQuote.recipients.map((recipient) => ({
    ...recipient,
    accessToken: tokenByRecipientId.get(recipient.id),
  }));

  return { ok: true, quote: sentQuote, version };
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

  return getQuoteVersions(db, quote.id);
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

async function upsertClient(
  db: SupabaseClient,
  organizationId: string,
  client: ClientInput,
) {
  const { data, error } = await db
    .from("clients")
    .upsert(
      {
        organization_id: organizationId,
        company_name: emptyToNull(client.companyName),
        contact_name: client.contactName,
        email: normalizeEmail(client.email),
        phone: emptyToNull(client.phone),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,email" },
    )
    .select("*")
    .single();

  throwIfError(error, "Upsert client");

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

  return {
    id: quoteRow.id,
    organizationId: quoteRow.organization_id,
    quoteNumber: quoteRow.quote_number,
    title: quoteRow.title,
    status: quoteRow.status,
    currency: quoteRow.currency,
    subtotalMinor: Number(quoteRow.subtotal_minor),
    discountMinor: Number(quoteRow.discount_minor),
    taxMinor: Number(quoteRow.tax_minor),
    totalMinor: Number(quoteRow.total_minor),
    client,
    lineItems: lineItems.map(mapLineItemRow),
    recipients: recipients.map(mapRecipientRow),
    signatureFields: signatureFields.map(mapSignatureFieldRow),
    currentVersion: quoteRow.current_version,
    createdByClerkUserId: quoteRow.created_by_clerk_user_id,
    validUntil: quoteRow.valid_until ?? undefined,
    terms: quoteRow.terms ?? undefined,
    notes: quoteRow.notes ?? undefined,
    sentAt: quoteRow.sent_at ?? undefined,
    lockedAt: quoteRow.locked_at ?? undefined,
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
      phone: "",
    };
  }

  return {
    companyName: row.company_name ?? "",
    contactName: row.contact_name,
    email: row.email,
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
      quantity: lineItem.quantity,
      unit_price_minor: lineItem.unitPriceMinor,
      discount_minor: lineItem.discountMinor,
      tax_rate: lineItem.taxRate,
      line_total_minor: lineItem.lineTotalMinor,
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

async function nextQuoteNumber(db: SupabaseClient, organizationId: string) {
  const year = new Date().getFullYear();
  const { count, error } = await db
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  throwIfError(error, "Count quotes");

  return `Q-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
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

  if (new Date(recipientRow.access_token_expires_at) < new Date()) {
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
    quote: version.snapshot,
    requiredSignatureFields: version.snapshot.signatureFields
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
): QuoteLineItem[] {
  return withCalculatedLineTotals(
    lineItems.map((lineItem, index) => ({
      id: randomUUID(),
      sortOrder: index + 1,
      name: lineItem.name,
      description: emptyToUndefined(lineItem.description),
      quantity: lineItem.quantity,
      unitPriceMinor: lineItem.unitPriceMinor,
      discountMinor: lineItem.discountMinor,
      taxRate: lineItem.taxRate,
    })),
  );
}

function mapLineItemRow(row: QuoteLineItemRow): QuoteLineItem {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    name: row.name,
    description: row.description ?? undefined,
    quantity: Number(row.quantity),
    unitPriceMinor: Number(row.unit_price_minor),
    discountMinor: Number(row.discount_minor),
    taxRate: Number(row.tax_rate),
    lineTotalMinor: Number(row.line_total_minor),
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
    accessTokenExpiresAt: row.access_token_expires_at,
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emptyToUndefined<T extends string | undefined>(value: T) {
  return value?.trim() ? value : undefined;
}

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value : null;
}

function stripBucketPrefix(path: string, bucket: string) {
  return path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
}

function normalizeIpAddress(value?: string) {
  return value?.split(",")[0]?.trim() || null;
}

function throwIfError(error: SupabaseError | undefined, context: string) {
  if (error) {
    throw new Error(`${context} failed: ${error.message}`);
  }
}
