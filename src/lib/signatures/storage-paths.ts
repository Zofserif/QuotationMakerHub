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
