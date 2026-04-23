export const lineItemImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type LineItemImageMimeType = (typeof lineItemImageMimeTypes)[number];

export type LineItemDataDraft = {
  title: string;
  detailedDescription: string;
  unit: string;
  unitPriceMinor: number;
  descriptionImageStoragePath?: string;
  descriptionImageMimeType?: LineItemImageMimeType;
};

export type LineItemData = LineItemDataDraft & {
  id: string;
  organizationId: string;
  createdByClerkUserId: string;
  descriptionImageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type LineItemImageUploadResult = {
  storagePath: string;
  mimeType: LineItemImageMimeType;
  url?: string;
};
