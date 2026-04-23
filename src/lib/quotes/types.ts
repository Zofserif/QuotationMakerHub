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
  email: string;
  phone?: string;
};

export type QuoteLineItem = {
  id: string;
  sortOrder: number;
  name: string;
  description?: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRate: number;
  lineTotalMinor: number;
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
  };
  client: ClientInput;
  recipients: Pick<QuoteRecipient, "id" | "name" | "email" | "role">[];
  lineItems: QuoteLineItem[];
  signatureFields: SignatureField[];
  validUntil?: string;
  terms?: string;
  notes?: string;
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
  title: string;
  client: ClientInput;
  currency: string;
  lineItems: Omit<QuoteLineItem, "id" | "sortOrder" | "lineTotalMinor">[];
  quoteLevelDiscountMinor?: number;
  validUntil?: string;
  terms?: string;
  notes?: string;
};

export type Quote = {
  id: string;
  organizationId: string;
  quoteNumber: string;
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
  terms?: string;
  notes?: string;
  sentAt?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
} & QuoteTotals;

export type UpdateQuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; code: "QUOTE_NOT_FOUND" | "QUOTE_LOCKED" };

export type SendQuoteResult =
  | { ok: true; quote: Quote; version: QuoteVersion }
  | {
      ok: false;
      code: "QUOTE_NOT_FOUND" | "QUOTE_LOCKED" | "QUOTE_NOT_SENDABLE";
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
