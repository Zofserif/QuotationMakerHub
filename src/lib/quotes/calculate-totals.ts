import type { QuoteLineItem, QuoteTotals } from "./types";

export type CalculatedLineItem = QuoteLineItem;
export type TaxMode = "inclusive" | "exclusive";

export function calculateLineTotalMinor(input: {
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRate: number;
  taxMode?: TaxMode;
}) {
  const lineSubtotal = Math.round(input.quantity * input.unitPriceMinor);
  const discounted = Math.max(0, lineSubtotal - input.discountMinor);
  const tax =
    input.taxMode === "inclusive"
      ? input.taxRate > 0
        ? Math.round(discounted * (input.taxRate / (1 + input.taxRate)))
        : 0
      : Math.round(discounted * input.taxRate);

  return {
    lineSubtotal,
    tax,
    lineTotalMinor:
      input.taxMode === "inclusive" ? discounted : discounted + tax,
  };
}

export function calculateQuoteTotals(
  lineItems: Pick<
    QuoteLineItem,
    "quantity" | "unitPriceMinor" | "discountMinor" | "taxRate"
  >[],
  quoteLevelDiscountMinor = 0,
  taxMode: TaxMode = "exclusive",
): QuoteTotals {
  const totals = lineItems.reduce<QuoteTotals>(
    (current, item) => {
      const { lineSubtotal, tax, lineTotalMinor } = calculateLineTotalMinor({
        ...item,
        taxMode,
      });

      current.subtotalMinor += lineSubtotal;
      current.discountMinor += item.discountMinor;
      current.taxMinor += tax;
      current.totalMinor += lineTotalMinor;

      return current;
    },
    {
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    },
  );

  return {
    ...totals,
    discountMinor: totals.discountMinor + quoteLevelDiscountMinor,
    totalMinor: Math.max(0, totals.totalMinor - quoteLevelDiscountMinor),
  };
}

export function withCalculatedLineTotals(
  lineItems: Omit<QuoteLineItem, "lineTotalMinor">[],
  taxMode: TaxMode = "exclusive",
) {
  return lineItems.map((lineItem) => ({
    ...lineItem,
    lineTotalMinor: calculateLineTotalMinor({
      ...lineItem,
      taxMode,
    }).lineTotalMinor,
  }));
}
