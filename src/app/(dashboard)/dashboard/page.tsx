import {
  FileSignature,
  Send,
  ShieldCheck,
} from "lucide-react";

import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { PipelineCurrencyCard } from "@/components/dashboard/pipeline-currency-card";
import { QuoteList } from "@/components/dashboard/quote-list";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { resolvePipelineCurrencySummary } from "@/lib/dashboard/pipeline-currency";
import { getPipelineCurrency, listQuotes } from "@/lib/quotes/persistence";
import { statusLabel } from "@/lib/quotes/quote-state";
import {
  quoteStatuses,
  type QuoteStatus,
  type QuoteVisibility,
} from "@/lib/quotes/types";

export const dynamic = "force-dynamic";

type DashboardSearchParams = {
  status?: string | string[];
  visibility?: string | string[];
};

type StatusTab = {
  label: string;
  status?: QuoteStatus;
};

const statusTabs: StatusTab[] = [
  { label: "All" },
  ...quoteStatuses.map((status) => ({
    label: statusLabel(status),
    status,
  })),
];

const visibilityTabs: Array<{ label: string; visibility: QuoteVisibility }> = [
  { label: "Active", visibility: "active" },
  { label: "Inactive", visibility: "archived" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { status: statusParam, visibility: visibilityParam } =
    await searchParams;
  const selectedStatus = parseQuoteStatus(statusParam);
  const selectedVisibility = parseQuoteVisibility(visibilityParam);
  const quoter = await requireQuoter();
  const [pipelineCurrency, activeQuotes, archivedQuotes] = await Promise.all([
    getPipelineCurrency(quoter),
    listQuotes(quoter, { visibility: "active" }),
    listQuotes(quoter, { visibility: "archived" }),
  ]);
  const quotes =
    selectedVisibility === "archived" ? archivedQuotes : activeQuotes;
  const visibleQuotes = selectedStatus
    ? quotes.filter((quote) => quote.status === selectedStatus)
    : quotes;
  const statusCounts = countQuotesByStatus(quotes);
  const visibilityCounts = new Map<QuoteVisibility, number>([
    ["active", activeQuotes.length],
    ["archived", archivedQuotes.length],
  ]);
  const visibilityFilterOptions = visibilityTabs.map((tab) => ({
    key: tab.visibility,
    label: tab.label,
    href: buildDashboardHref({
      status: selectedStatus,
      visibility: tab.visibility,
    }),
    count: visibilityCounts.get(tab.visibility) ?? 0,
    selected: selectedVisibility === tab.visibility,
  }));
  const statusFilterOptions = statusTabs.map((tab) => ({
    key: tab.status ?? "all",
    label: tab.label,
    href: buildDashboardHref({
      status: tab.status,
      visibility: selectedVisibility,
    }),
    count: tab.status ? (statusCounts.get(tab.status) ?? 0) : quotes.length,
    selected: selectedStatus === tab.status,
  }));
  const sentCount = quotes.filter((quote) => quote.status !== "draft").length;
  const acceptedCount = quotes.filter((quote) =>
    ["accepted", "locked"].includes(quote.status),
  ).length;
  const pipelineSummary = await resolvePipelineCurrencySummary(
    quotes,
    pipelineCurrency,
  );

  return (
    <div className="space-y-4">
      <section>
        <div>
          <p className="text-sm font-medium text-stone-500">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-950">
            Quote dashboard
          </h1>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={FileSignature}
          label="Total quotes"
          value={String(quotes.length)}
        />
        <Metric icon={Send} label="Sent quotes" value={String(sentCount)} />
        <Metric
          icon={ShieldCheck}
          label="Accepted"
          value={String(acceptedCount)}
        />
        <PipelineCurrencyCard
          {...pipelineSummary}
          className="col-span-3 md:col-span-1"
        />
      </section>

      <DashboardFilters
        statusOptions={statusFilterOptions}
        visibilityOptions={visibilityFilterOptions}
      />

      <QuoteList
        emptyMessage={
          selectedStatus
            ? `No ${statusLabel(selectedStatus).toLowerCase()} quotations yet.`
            : "No quotations yet."
        }
        quotes={visibleQuotes}
      />
    </div>
  );
}

function parseQuoteStatus(value?: string | string[]) {
  const status = Array.isArray(value) ? value[0] : value;

  return quoteStatuses.includes(status as QuoteStatus)
    ? (status as QuoteStatus)
    : undefined;
}

function parseQuoteVisibility(value?: string | string[]): QuoteVisibility {
  const visibility = Array.isArray(value) ? value[0] : value;

  return visibility === "archived" || visibility === "deleted"
    ? "archived"
    : "active";
}

function buildDashboardHref({
  status,
  visibility,
}: {
  status?: QuoteStatus;
  visibility: QuoteVisibility;
}) {
  const params = new URLSearchParams();

  if (visibility !== "active") {
    params.set("visibility", visibility);
  }

  if (status) {
    params.set("status", status);
  }

  const query = params.toString();

  return query ? `/dashboard?${query}` : "/dashboard";
}

function countQuotesByStatus(quotes: Array<{ status: QuoteStatus }>) {
  const counts = new Map<QuoteStatus, number>(
    quoteStatuses.map((status) => [status, 0]),
  );

  for (const quote of quotes) {
    counts.set(quote.status, (counts.get(quote.status) ?? 0) + 1);
  }

  return counts;
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileSignature;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-3 text-center sm:p-3 sm:text-left">
      <div className="mx-auto mb-2 flex size-7 items-center justify-center rounded-md bg-stone-100 sm:mx-0 sm:size-8">
        <Icon className="size-3.5 text-stone-700 sm:size-4" />
      </div>
      <p className="min-w-0 text-xs leading-tight text-stone-500 sm:text-sm">
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-bold text-stone-950 sm:text-xl">
        {value}
      </p>
    </div>
  );
}
