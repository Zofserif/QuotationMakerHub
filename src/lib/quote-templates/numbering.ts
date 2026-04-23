const sequenceTokenPattern = /N+/g;

export function formatQuoteNumber(
  format: string,
  sequence: number,
  date = new Date(),
) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  const normalizedFormat = format.trim() || "Q-MMDDYYYY-NNNN";

  return normalizedFormat
    .replaceAll("YYYY", year)
    .replaceAll("YY", year.slice(-2))
    .replaceAll("MM", month)
    .replaceAll("DD", day)
    .replace(sequenceTokenPattern, (token) =>
      String(sequence).padStart(token.length, "0"),
    );
}
