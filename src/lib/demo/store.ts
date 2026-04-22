import { randomUUID } from "crypto";

import {
  createClientAccessToken,
  defaultTokenExpiry,
  hashClientAccessToken,
  isClientTokenHashMatch,
} from "@/lib/client-links/token";
import { createAuditEvent } from "@/lib/audit/write-audit-event";
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
  ClientQuoteView,
  Quote,
  QuoteDraft,
  QuoteLineItem,
  QuoteRecipient,
  QuoteVersion,
  SignatureAsset,
  SignaturePlacement,
} from "@/lib/quotes/types";
import { hashImageBytes, dataUrlToBuffer } from "@/lib/signatures/hash-image";
import { signatureStoragePath } from "@/lib/signatures/storage-paths";

const DEMO_ORG_ID = "demo_org";
const DEMO_USER_ID = "demo_quoter";

type DemoState = {
  quotes: Quote[];
  versions: QuoteVersion[];
  assets: SignatureAsset[];
  placements: SignaturePlacement[];
  auditEvents: Record<string, AuditEvent[]>;
  quoteCounter: number;
};

const globalForDemo = globalThis as typeof globalThis & {
  __quotationMakerDemoState?: DemoState;
};

const demoState =
  globalForDemo.__quotationMakerDemoState ??
  seedDemoState();

globalForDemo.__quotationMakerDemoState = demoState;

function seedDemoState(): DemoState {
  const quoteId = randomUUID();
  const recipientId = randomUUID();
  const signatureFieldId = randomUUID();
  const now = new Date().toISOString();
  const lineItems = normalizeLineItems([
    {
      name: "Discovery and Planning",
      description: "Project kickoff, stakeholder interviews, and scope plan.",
      quantity: 1,
      unitPriceMinor: 150000,
      discountMinor: 0,
      taxRate: 0.12,
    },
    {
      name: "Responsive Website Build",
      description: "Design implementation, CMS-ready pages, and QA pass.",
      quantity: 1,
      unitPriceMinor: 420000,
      discountMinor: 25000,
      taxRate: 0.12,
    },
  ]);
  const totals = calculateQuoteTotals(lineItems);
  const quote: Quote = {
    id: quoteId,
    organizationId: DEMO_ORG_ID,
    quoteNumber: "Q-2026-0001",
    title: "Website Redesign Quotation",
    status: "draft",
    currency: "USD",
    client: {
      companyName: "Acme Corp",
      contactName: "Jane Client",
      email: "jane@example.com",
      phone: "",
    },
    lineItems,
    recipients: [
      {
        id: recipientId,
        name: "Jane Client",
        email: "jane@example.com",
        role: "client",
        status: "pending",
      },
    ],
    signatureFields: [
      {
        id: signatureFieldId,
        recipientId,
        signerType: "client",
        label: "Client Signature",
        anchorKey: "client_signature_block_primary",
        required: true,
        widthPx: 240,
        heightPx: 96,
      },
    ],
    currentVersion: 1,
    createdByClerkUserId: DEMO_USER_ID,
    validUntil: "2026-05-31",
    terms: "50% down payment, 50% on completion.",
    notes: "Timeline starts after written acceptance.",
    createdAt: now,
    updatedAt: now,
    ...totals,
  };

  return {
    quotes: [quote],
    versions: [],
    assets: [],
    placements: [],
    auditEvents: {
      [quoteId]: [
        createAuditEvent({
          actorType: "quoter",
          actorRef: DEMO_USER_ID,
          eventType: "quote.created",
          metadata: {},
        }),
      ],
    },
    quoteCounter: 2,
  };
}

export function listDemoQuotes() {
  return demoState.quotes.toSorted((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getDemoQuote(quoteId: string) {
  return demoState.quotes.find((quote) => quote.id === quoteId) ?? null;
}

export function getDemoQuoteVersions(quoteId: string) {
  return demoState.versions.filter((version) => version.quoteId === quoteId);
}

export function getDemoAuditEvents(quoteId: string) {
  return demoState.auditEvents[quoteId] ?? [];
}

export function createDemoQuote(draft: QuoteDraft) {
  const quoteId = randomUUID();
  const recipientId = randomUUID();
  const now = new Date().toISOString();
  const lineItems = normalizeLineItems(draft.lineItems);
  const totals = calculateQuoteTotals(
    lineItems,
    draft.quoteLevelDiscountMinor ?? 0,
  );
  const quote: Quote = {
    id: quoteId,
    organizationId: DEMO_ORG_ID,
    quoteNumber: `Q-2026-${String(demoState.quoteCounter).padStart(4, "0")}`,
    title: draft.title,
    status: "draft",
    currency: draft.currency,
    client: draft.client,
    lineItems,
    recipients: [
      {
        id: recipientId,
        name: draft.client.contactName,
        email: draft.client.email,
        role: "client",
        status: "pending",
      },
    ],
    signatureFields: [
      {
        id: randomUUID(),
        recipientId,
        signerType: "client",
        label: "Client Signature",
        anchorKey: "client_signature_block_primary",
        required: true,
        widthPx: 240,
        heightPx: 96,
      },
    ],
    currentVersion: 1,
    createdByClerkUserId: DEMO_USER_ID,
    validUntil: emptyToUndefined(draft.validUntil),
    terms: emptyToUndefined(draft.terms),
    notes: emptyToUndefined(draft.notes),
    createdAt: now,
    updatedAt: now,
    ...totals,
  };

  demoState.quoteCounter += 1;
  demoState.quotes.unshift(quote);
  appendAudit(quote.id, "quote.created", "quoter", DEMO_USER_ID);
  return quote;
}

export function updateDemoQuote(quoteId: string, draft: QuoteDraft) {
  const quote = getDemoQuote(quoteId);

  if (!quote) {
    return null;
  }

  const lineItems = normalizeLineItems(draft.lineItems);
  const totals = calculateQuoteTotals(
    lineItems,
    draft.quoteLevelDiscountMinor ?? 0,
  );
  quote.title = draft.title;
  quote.currency = draft.currency;
  quote.client = draft.client;
  quote.lineItems = lineItems;
  quote.validUntil = emptyToUndefined(draft.validUntil);
  quote.terms = emptyToUndefined(draft.terms);
  quote.notes = emptyToUndefined(draft.notes);
  quote.subtotalMinor = totals.subtotalMinor;
  quote.discountMinor = totals.discountMinor;
  quote.taxMinor = totals.taxMinor;
  quote.totalMinor = totals.totalMinor;
  quote.updatedAt = new Date().toISOString();
  quote.recipients = quote.recipients.map((recipient) => ({
    ...recipient,
    name: draft.client.contactName,
    email: draft.client.email,
  }));
  appendAudit(quote.id, "quote.updated", "quoter", DEMO_USER_ID);

  return quote;
}

export function sendDemoQuote(quoteId: string) {
  const quote = getDemoQuote(quoteId);

  if (!quote) {
    return { ok: false as const, code: "QUOTE_NOT_FOUND" };
  }

  if (quote.lineItems.length === 0 || quote.signatureFields.length === 0) {
    return { ok: false as const, code: "QUOTE_NOT_SENDABLE" };
  }

  const snapshot = createVersionSnapshot(quote);
  const version: QuoteVersion = {
    id: randomUUID(),
    quoteId: quote.id,
    versionNumber: quote.currentVersion,
    snapshot,
    snapshotSha256: hashSnapshot(snapshot),
    createdByClerkUserId: DEMO_USER_ID,
    createdAt: new Date().toISOString(),
  };

  demoState.versions.push(version);
  quote.recipients = quote.recipients.map((recipient) => {
    const token = createClientAccessToken();

    return {
      ...recipient,
      accessToken: token,
      accessTokenHash: hashClientAccessToken(token),
      accessTokenExpiresAt: defaultTokenExpiry(),
      status: "pending",
    };
  });
  quote.status = "sent";
  quote.sentAt = new Date().toISOString();
  quote.updatedAt = quote.sentAt;
  appendAudit(quote.id, "quote.sent", "quoter", DEMO_USER_ID, {
    versionNumber: version.versionNumber,
    recipientCount: quote.recipients.length,
  });

  return { ok: true as const, quote, version };
}

export function getDemoClientQuoteView(token: string) {
  const match = findRecipientByToken(token);

  if (!match) {
    return null;
  }

  const { quote, recipient } = match;
  const version = getLatestVersion(quote.id);

  if (!version) {
    return null;
  }

  if (recipient.status === "pending") {
    recipient.status = "viewed";
    recipient.viewedAt = new Date().toISOString();
    quote.status = getAggregateQuoteStatus(quote);
    appendAudit(quote.id, "quote.viewed", "client", recipient.id);
  }

  return buildClientView(quote, version, recipient);
}

export function placeDemoSignature(input: {
  token: string;
  signatureFieldId: string;
  imageBase64: string;
  sourceMethod: "camera" | "upload" | "draw";
  ipAddress?: string;
  userAgent?: string;
}) {
  const match = findRecipientByToken(input.token);

  if (!match) {
    return { ok: false as const, code: "TOKEN_INVALID" };
  }

  const { quote, recipient } = match;

  if (recipient.lockedAt || recipient.status === "accepted") {
    return { ok: false as const, code: "RECIPIENT_LOCKED" };
  }

  const version = getLatestVersion(quote.id);
  const field = quote.signatureFields.find(
    (signatureField) =>
      signatureField.id === input.signatureFieldId &&
      signatureField.recipientId === recipient.id,
  );

  if (!version || !field) {
    return { ok: false as const, code: "SIGNATURE_REQUIRED" };
  }

  const bytes = dataUrlToBuffer(input.imageBase64);
  const signatureAssetId = randomUUID();
  const asset: SignatureAsset = {
    id: signatureAssetId,
    ownerType: "client",
    ownerRef: recipient.id,
    storagePath: signatureStoragePath({
      organizationId: quote.organizationId,
      ownerType: "client",
      ownerRef: recipient.id,
      signatureAssetId,
    }),
    mimeType: "image/png",
    imageSha256: hashImageBytes(bytes),
    sourceMethod: input.sourceMethod,
    dataUrl: input.imageBase64,
    createdAt: new Date().toISOString(),
  };
  const placement: SignaturePlacement = {
    id: randomUUID(),
    quoteId: quote.id,
    quoteVersionId: version.id,
    signatureFieldId: field.id,
    recipientId: recipient.id,
    signatureAssetId,
    placedAt: new Date().toISOString(),
  };

  demoState.assets.push(asset);
  demoState.placements = demoState.placements.filter(
    (existing) =>
      !(
        existing.quoteVersionId === version.id &&
        existing.signatureFieldId === field.id &&
        existing.recipientId === recipient.id
      ),
  );
  demoState.placements.push(placement);
  recipient.status = "signed";
  recipient.signedAt = placement.placedAt;
  quote.status = getAggregateQuoteStatus(quote);
  appendAudit(quote.id, "signature.placed", "client", recipient.id, {
    signatureFieldId: field.id,
    sourceMethod: input.sourceMethod,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return { ok: true as const, asset, placement };
}

export function acceptDemoQuote(input: {
  token: string;
  typedName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const match = findRecipientByToken(input.token);

  if (!match) {
    return { ok: false as const, code: "TOKEN_INVALID" };
  }

  const { quote, recipient } = match;

  if (recipient.lockedAt || recipient.status === "accepted") {
    return { ok: false as const, code: "RECIPIENT_LOCKED" };
  }

  const version = getLatestVersion(quote.id);

  if (!version) {
    return { ok: false as const, code: "QUOTE_NOT_FOUND" };
  }

  const missingField = quote.signatureFields
    .filter((field) => field.recipientId === recipient.id && field.required)
    .find(
      (field) =>
        !demoState.placements.some(
          (placement) =>
            placement.quoteVersionId === version.id &&
            placement.signatureFieldId === field.id &&
            placement.recipientId === recipient.id,
        ),
    );

  if (missingField) {
    return { ok: false as const, code: "SIGNATURE_REQUIRED" };
  }

  const acceptedAt = new Date().toISOString();
  recipient.status = "accepted";
  recipient.acceptedAt = acceptedAt;
  recipient.lockedAt = acceptedAt;
  quote.status = getAggregateQuoteStatus(quote);

  if (quote.status === "locked") {
    quote.lockedAt = acceptedAt;
  }

  appendAudit(quote.id, "quote.accepted", "client", recipient.id, {
    typedName: input.typedName,
    versionNumber: version.versionNumber,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  if (quote.status === "locked") {
    appendAudit(quote.id, "quote.locked", "system", "system");
  }

  return {
    ok: true as const,
    quote,
    recipient,
    acceptedAt,
    locked: Boolean(recipient.lockedAt),
  };
}

export function createDemoPdfExport(quoteId: string) {
  const quote = getDemoQuote(quoteId);
  const version = quote ? getLatestVersion(quote.id) : null;

  if (!quote || !version) {
    return null;
  }

  const pdfExportId = randomUUID();
  appendAudit(quote.id, "pdf.exported", "quoter", DEMO_USER_ID, {
    pdfExportId,
    versionNumber: version.versionNumber,
  });

  return {
    pdfExportId,
    downloadUrl: `/print/quotes/${quote.id}?version=${version.versionNumber}`,
    expiresInSeconds: 300,
  };
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

function appendAudit(
  quoteId: string,
  eventType: string,
  actorType: "quoter" | "client" | "system",
  actorRef?: string,
  metadata: Record<string, unknown> = {},
) {
  demoState.auditEvents[quoteId] ??= [];
  demoState.auditEvents[quoteId].push(
    createAuditEvent({
      actorType,
      actorRef,
      eventType,
      metadata,
    }),
  );
}

function findRecipientByToken(token: string) {
  for (const quote of demoState.quotes) {
    for (const recipient of quote.recipients) {
      if (
        recipient.accessTokenHash &&
        isClientTokenHashMatch(token, recipient.accessTokenHash)
      ) {
        if (
          recipient.accessTokenExpiresAt &&
          new Date(recipient.accessTokenExpiresAt) < new Date()
        ) {
          return null;
        }

        return { quote, recipient };
      }
    }
  }

  return null;
}

function getLatestVersion(quoteId: string) {
  return getDemoQuoteVersions(quoteId).toSorted(
    (a, b) => b.versionNumber - a.versionNumber,
  )[0];
}

function buildClientView(
  quote: Quote,
  version: QuoteVersion,
  recipient: QuoteRecipient,
): ClientQuoteView {
  const placements = demoState.placements.filter(
    (placement) =>
      placement.quoteVersionId === version.id &&
      placement.recipientId === recipient.id,
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
            ? demoState.assets.find(
                (asset) => asset.id === placement.signatureAssetId,
              )
            : undefined,
        };
      }),
    placements,
  };
}

function emptyToUndefined<T extends string | undefined>(value: T) {
  return value?.trim() ? value : undefined;
}
