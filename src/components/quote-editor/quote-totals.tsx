import { Separator } from "@/components/ui/separator";
import type { TaxMode } from "@/lib/quotes/calculate-totals";
import type { QuoteTotals } from "@/lib/quotes/types";
import { formatMoney } from "@/lib/utils";

export function QuoteTotalsView({
  totals,
  currency,
  taxMode = "exclusive",
}: {
  totals: QuoteTotals;
  currency: string;
  taxMode?: TaxMode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <TotalRow
        label="Subtotal"
        value={formatMoney(totals.subtotalMinor, currency)}
      />
      <TotalRow
        label="Discount"
        value={`-${formatMoney(totals.discountMinor, currency)}`}
      />
      <TotalRow
        label={taxMode === "inclusive" ? "Tax Included" : "Tax"}
        value={formatMoney(totals.taxMinor, currency)}
      />
      <Separator />
      <TotalRow
        label="Total"
        value={formatMoney(totals.totalMinor, currency)}
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
