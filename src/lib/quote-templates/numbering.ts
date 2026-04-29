const sequenceTokenPattern = /N+/g;
const quoteNumberFormat = "Q-MMDDYYYY-NNNN";

export function formatQuoteNumber(sequence: number, date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());

  return quoteNumberFormat
    .replaceAll("YYYY", year)
    .replaceAll("YY", year.slice(-2))
    .replaceAll("MM", month)
    .replaceAll("DD", day)
    .replace(sequenceTokenPattern, (token) =>
      String(sequence).padStart(token.length, "0"),
    );
}
