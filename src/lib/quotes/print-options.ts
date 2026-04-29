export const quotePaperSizes = [
  {
    value: "short-bond",
    label: "Short bond paper",
    cssSize: "8.5in 11in",
    previewWidth: "8.5in",
  },
  {
    value: "long-bond",
    label: "Long bond paper",
    cssSize: "8.5in 13in",
    previewWidth: "8.5in",
  },
  {
    value: "legal",
    label: "Legal",
    cssSize: "8.5in 14in",
    previewWidth: "8.5in",
  },
  {
    value: "a4",
    label: "A4",
    cssSize: "210mm 297mm",
    previewWidth: "210mm",
  },
] as const;

export type QuotePaperSize = (typeof quotePaperSizes)[number]["value"];

export const quoteSignatureModes = [
  { value: "electronic", label: "Digital" },
  { value: "wet", label: "Wet signature" },
] as const;

export type QuoteSignatureMode =
  (typeof quoteSignatureModes)[number]["value"];

export function parseQuotePaperSize(value?: string | null): QuotePaperSize {
  return quotePaperSizes.some((paper) => paper.value === value)
    ? (value as QuotePaperSize)
    : "short-bond";
}

export function getQuotePaperSizeOption(value: QuotePaperSize) {
  return (
    quotePaperSizes.find((paper) => paper.value === value) ??
    quotePaperSizes[0]
  );
}

export function parseQuoteSignatureMode(
  value?: string | null,
): QuoteSignatureMode {
  return quoteSignatureModes.some((mode) => mode.value === value)
    ? (value as QuoteSignatureMode)
    : "electronic";
}
