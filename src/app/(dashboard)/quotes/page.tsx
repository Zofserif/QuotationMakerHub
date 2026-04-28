import Link from "next/link";

import { QuoteList } from "@/components/dashboard/quote-list";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { listQuotes } from "@/lib/quotes/persistence";
import {
  quoteStatuses,
  quoteVisibilities,
  type QuoteStatus,
  type QuoteVisibility,
} from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const visibilityTabs: Array<{ label: string; value: QuoteVisibility }> = [
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
  { label: "Deleted", value: "deleted" },
];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; visibility?: string }>;
}) {
  const { status: statusParam, visibility: visibilityParam } =
    await searchParams;
  const visibility = parseQuoteVisibility(visibilityParam);
  const status = parseQuoteStatus(statusParam);
  const quoter = await requireQuoter();
  const quotes = (await listQuotes(quoter, { visibility })).filter((quote) =>
    status ? quote.status === status : true,
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">Quotations</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Search and filter quotes
        </h1>
      </section>
      <nav
        aria-label="Quote visibility"
        className="flex flex-wrap gap-2 border-b border-stone-200"
      >
        {visibilityTabs.map((tab) => (
          <Link
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-semibold transition",
              visibility === tab.value
                ? "border-stone-950 text-stone-950"
                : "border-transparent text-stone-500 hover:text-stone-900",
            )}
            href={
              tab.value === "active"
                ? "/quotes"
                : `/quotes?visibility=${tab.value}`
            }
            key={tab.value}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <QuoteList quotes={quotes} />
    </div>
  );
}

function parseQuoteVisibility(value?: string): QuoteVisibility {
  return quoteVisibilities.includes(value as QuoteVisibility)
    ? (value as QuoteVisibility)
    : "active";
}

function parseQuoteStatus(value?: string): QuoteStatus | undefined {
  return quoteStatuses.includes(value as QuoteStatus)
    ? (value as QuoteStatus)
    : undefined;
}
