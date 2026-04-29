import { Separator } from "@/components/ui/separator";
import type { MoneyDisplay } from "@/lib/currency";
import type { TaxMode } from "@/lib/quotes/calculate-totals";
import type { QuoteTotals } from "@/lib/quotes/types";
import { formatMoney } from "@/lib/utils";

export function QuoteTotalsView({
  totals,
  currency,
  taxEnabled = true,
  taxMode = "exclusive",
  moneyDisplay = "symbol",
}: {
  totals: QuoteTotals;
  currency: string;
  taxEnabled?: boolean;
  taxMode?: TaxMode;
  moneyDisplay?: MoneyDisplay;
}) {
  const vatInclusive = taxEnabled && taxMode === "inclusive";
  const taxLabel = !taxEnabled
    ? "VAT Off"
    : vatInclusive
      ? "VAT Included"
      : "VAT";

  if (vatInclusive) {
    return (
      <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <TotalRow
          label="Total"
          value={formatMoney(totals.totalMinor, currency, moneyDisplay)}
          strong
        />
        <p className="text-sm text-stone-600">
          All prices are VAT inclusive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <TotalRow
        label="Subtotal"
        value={formatMoney(totals.subtotalMinor, currency, moneyDisplay)}
      />
      {totals.discountMinor > 0 ? (
        <TotalRow
          label="Discount"
          value={`-${formatMoney(totals.discountMinor, currency, moneyDisplay)}`}
        />
      ) : null}
      <TotalRow
        label={taxLabel}
        value={formatMoney(totals.taxMinor, currency, moneyDisplay)}
      />
      <Separator />
      <TotalRow
        label="Total"
        value={formatMoney(totals.totalMinor, currency, moneyDisplay)}
        strong
      />
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold" : "text-sm text-stone-600"}>
        {label}
      </span>
      <span
        className={
          strong ? "text-xl font-bold text-stone-950" : "text-sm text-stone-900"
        }
      >
        {value}
      </span>
    </div>
  );
}
