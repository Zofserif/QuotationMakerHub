import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { LineItemImageMimeType } from "@/lib/line-item-data/types";

export const quoteStatuses = [
  "draft",
  "sent",
  "viewed",
  "partially_signed",
  "accepted",
  "rejected",
  "expired",
  "locked",
] as const;

export type QuoteStatus = (typeof quoteStatuses)[number];

export const quoteVisibilities = ["active", "archived", "deleted"] as const;

export type QuoteVisibility = (typeof quoteVisibilities)[number];

export const recipientStatuses = [
  "pending",
  "viewed",
  "signed",
  "accepted",
  "rejected",
  "expired",
] as const;

export type RecipientStatus = (typeof recipientStatuses)[number];

export type SourceMethod = "camera" | "upload" | "draw";

export type ClientInput = {
  companyName?: string;
  contactName: string;
  address?: string;
  email?: string;
  phone?: string;
};

export type QuoteLineItem = {
  id: string;
  sortOrder: number;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRate: number;
  lineTotalMinor: number;
  descriptionImageStoragePath?: string;
  descriptionImageMimeType?: LineItemImageMimeType;
  descriptionImageUrl?: string;
};

export type QuoteTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export type SignatureField = {
  id: string;
  recipientId?: string;
  signerType: "quoter" | "client";
  label: string;
  anchorKey: string;
  required: boolean;
  widthPx: number;
  heightPx: number;
};

export type QuoteRecipient = {
  id: string;
  clientId?: string;
  name: string;
  email: string;
  role: "client" | "quoter";
  status: RecipientStatus;
  accessTokenHash?: string;
  accessTokenExpiresAt?: string;
  accessToken?: string;
  shareLinkIssued?: boolean;
  viewedAt?: string;
  signedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  lockedAt?: string;
};

export type SignatureAsset = {
  id: string;
  ownerType: "quoter" | "client";
  ownerRef: string;
  storagePath: string;
  mimeType: "image/png";
  widthPx?: number;
  heightPx?: number;
  imageSha256: string;
  sourceMethod: SourceMethod;
  dataUrl?: string;
  createdAt: string;
};

export type SignaturePlacement = {
  id: string;
  quoteId: string;
  quoteVersionId: string;
  signatureFieldId: string;
  recipientId?: string;
  signatureAssetId: string;
  placedAt: string;
};

export type AuditEvent = {
  id: string;
  actorType: "quoter" | "client" | "system";
  actorRef?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type QuoteVersionSnapshot = {
  quoteNumber: string;
  title: string;
  currency: string;
  business: {
    name: string;
    email: string;
    address: string;
    logoDataUrl?: string;
    telephone?: string;
    phone?: string;
    vatRegTin?: string;
  };
  template?: QuoteTemplate;
  client: ClientInput;
  recipients: Pick<QuoteRecipient, "id" | "name" | "email" | "role">[];
  lineItems: QuoteLineItem[];
  signatureFields: SignatureField[];
  requestSummary?: string;
  validUntil?: string;
  issuedAt?: string;
  terms?: string;
  notes?: string;
  quoterSignature?: {
    printedName: string;
    asset?: SignatureAsset;
  };
} & QuoteTotals;

export type QuoteVersion = {
  id: string;
  quoteId: string;
  versionNumber: number;
  snapshot: QuoteVersionSnapshot;
  snapshotSha256: string;
  createdByClerkUserId: string;
  createdAt: string;
};

export type QuoteDraft = {
  quotationName: string;
  title: string;
  client: ClientInput;
  currency: string;
  lineItems: Omit<QuoteLineItem, "id" | "sortOrder" | "lineTotalMinor">[];
  quoteLevelDiscountMinor?: number;
  validUntil: string;
  requestSummary?: string;
  terms?: string;
  notes?: string;
  templateSnapshot?: QuoteTemplate;
  quoterPrintedName?: string;
  quoterSignatureAsset?: SignatureAsset | null;
};

export type Quote = {
  id: string;
  organizationId: string;
  visibility: QuoteVisibility;
  quoteNumber: string;
  quotationName: string;
  title: string;
  status: QuoteStatus;
  currency: string;
  client: ClientInput;
  lineItems: QuoteLineItem[];
  recipients: QuoteRecipient[];
  signatureFields: SignatureField[];
  currentVersion: number;
  createdByClerkUserId: string;
  validUntil?: string;
  requestSummary?: string;
  terms?: string;
  notes?: string;
  templateSnapshot?: QuoteTemplate;
  quoterPrintedName?: string;
  quoterSignatureAsset?: SignatureAsset | null;
  sentAt?: string;
  lockedAt?: string;
  archivedAt?: string;
  archivedByClerkUserId?: string;
  deletedAt?: string;
  deletedByClerkUserId?: string;
  createdAt: string;
  updatedAt: string;
} & QuoteTotals;

export type QuoteShareLink = {
  recipientId: string;
  name: string;
  email: string;
  status: RecipientStatus;
  accessToken: string;
  accessTokenExpiresAt?: string;
  signingPath: string;
};

export type UnavailableQuoteShareLink = {
  recipientId: string;
  name: string;
  email: string;
  status: RecipientStatus;
  reason: "legacy_hash_only";
};

export type UpdateQuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; code: "QUOTE_NOT_FOUND" | "QUOTE_LOCKED" };

export type UpdateQuoteVisibilityResult =
  | { ok: true; quote: Quote }
  | { ok: false; code: "QUOTE_NOT_FOUND" };

export type DeleteQuoteResult =
  | { ok: true; quoteId: string }
  | { ok: false; code: "QUOTE_NOT_FOUND" | "QUOTE_NOT_ARCHIVED" };

export type SendQuoteResult =
  | {
      ok: true;
      quote: Quote;
      version: QuoteVersion;
      shareLinks: QuoteShareLink[];
      unavailableShareLinks: UnavailableQuoteShareLink[];
    }
  | {
      ok: false;
      code: "QUOTE_NOT_FOUND" | "QUOTE_LOCKED" | "QUOTE_NOT_SENDABLE";
    };

export type EnsureQuoteShareLinksResult =
  | {
      ok: true;
      quote: Quote;
      shareLinks: QuoteShareLink[];
      unavailableShareLinks: UnavailableQuoteShareLink[];
      createdCount: number;
      returnedCount: number;
      unavailableCount: number;
    }
  | {
      ok: false;
      code: "QUOTE_NOT_FOUND" | "QUOTE_LOCKED" | "QUOTE_NOT_SHAREABLE";
    };

export type ClientQuoteView = {
  quoteId: string;
  versionNumber: number;
  recipient: Pick<
    QuoteRecipient,
    "id" | "name" | "email" | "status" | "acceptedAt" | "lockedAt"
  >;
  quote: QuoteVersionSnapshot;
  requiredSignatureFields: Array<
    SignatureField & {
      status: "signed" | "unsigned";
      placement?: SignaturePlacement;
      signatureAsset?: SignatureAsset;
    }
  >;
  placements: SignaturePlacement[];
};
