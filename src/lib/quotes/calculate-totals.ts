import type { QuoteLineItem, QuoteTotals } from "./types";

export type CalculatedLineItem = QuoteLineItem;

export function calculateLineTotalMinor(input: {
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRate: number;
}) {
  const lineSubtotal = Math.round(input.quantity * input.unitPriceMinor);
  const discounted = Math.max(0, lineSubtotal - input.discountMinor);
  const tax = Math.round(discounted * input.taxRate);

  return {
    lineSubtotal,
    tax,
    lineTotalMinor: discounted + tax,
  };
}

export function calculateQuoteTotals(
  lineItems: Pick<
    QuoteLineItem,
    "quantity" | "unitPriceMinor" | "discountMinor" | "taxRate"
  >[],
  quoteLevelDiscountMinor = 0,
): QuoteTotals {
  return lineItems.reduce<QuoteTotals>(
    (totals, item) => {
      const { lineSubtotal, tax } = calculateLineTotalMinor(item);
      const discountMinor = item.discountMinor;

      totals.subtotalMinor += lineSubtotal;
      totals.discountMinor += discountMinor;
      totals.taxMinor += tax;
      totals.totalMinor =
        totals.subtotalMinor - totals.discountMinor + totals.taxMinor;

      return totals;
    },
    {
      subtotalMinor: 0,
      discountMinor: quoteLevelDiscountMinor,
      taxMinor: 0,
      totalMinor: 0,
    },
  );
}

export function withCalculatedLineTotals(
  lineItems: Omit<QuoteLineItem, "lineTotalMinor">[],
) {
  return lineItems.map((lineItem) => ({
    ...lineItem,
    lineTotalMinor: calculateLineTotalMinor(lineItem).lineTotalMinor,
  }));
}
