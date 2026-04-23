export function signatureStoragePath(input: {
  organizationId: string;
  ownerType: "quoter" | "client";
  ownerRef: string;
  signatureAssetId: string;
}) {
  return `signature-assets/${input.organizationId}/${input.ownerType}/${input.ownerRef}/${input.signatureAssetId}.png`;
}

export function pdfStoragePath(input: {
  organizationId: string;
  quoteId: string;
  versionNumber: number;
  pdfExportId: string;
}) {
  return `quote-pdfs/${input.organizationId}/${input.quoteId}/v${input.versionNumber}/${input.pdfExportId}.pdf`;
}

export function lineItemImageStoragePath(input: {
  organizationId: string;
  imageId: string;
  extension: string;
}) {
  return `line-item-images/${input.organizationId}/line-item-data/${input.imageId}.${input.extension}`;
}
