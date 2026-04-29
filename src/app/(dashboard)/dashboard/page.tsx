import {
  Database,
  FileSignature,
  FileText,
  Send,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { DashboardStatusTabs } from "@/components/dashboard/dashboard-status-tabs";
import { LinkButton } from "@/components/ui/button";
import { QuoteList } from "@/components/dashboard/quote-list";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { listQuotes } from "@/lib/quotes/persistence";
import { statusLabel } from "@/lib/quotes/quote-state";
import {
  quoteStatuses,
  type QuoteStatus,
  type QuoteVisibility,
} from "@/lib/quotes/types";
import { formatMoney } from "@/lib/utils";

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
  { label: "Archived", visibility: "archived" },
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
  const [activeQuotes, archivedQuotes] = await Promise.all([
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
  const visibilityNavigationTabs = visibilityTabs.map((tab) => ({
    key: tab.visibility,
    label: tab.label,
    href: buildDashboardHref({
      status: selectedStatus,
      visibility: tab.visibility,
    }),
    count: visibilityCounts.get(tab.visibility) ?? 0,
    selected: selectedVisibility === tab.visibility,
  }));
  const tabs = statusTabs.map((tab) => ({
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
  const pipelineValue = formatPipelineValue(quotes);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-950">
            Quote dashboard
          </h1>
        </div>
        <LinkButton href="/quote-template" variant="secondary">
          <FileText className="size-4" />
          Quote Template
        </LinkButton>
        <LinkButton href="/line-item-data" variant="secondary">
          <Database className="size-4" />
          Line Item Data
        </LinkButton>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
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
        <Metric
          icon={TrendingUp}
          label="Pipeline"
          value={pipelineValue}
        />
      </section>

      <DashboardStatusTabs
        ariaLabel="Quotation visibility"
        tabs={visibilityNavigationTabs}
      />
      <DashboardStatusTabs tabs={tabs} />

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

function formatPipelineValue(
  quotes: Array<{ currency: string; totalMinor: number }>,
) {
  const totalsByCurrency = new Map<string, number>();

  for (const quote of quotes) {
    totalsByCurrency.set(
      quote.currency,
      (totalsByCurrency.get(quote.currency) ?? 0) + quote.totalMinor,
    );
  }

  if (totalsByCurrency.size === 0) {
    return formatMoney(0);
  }

  return Array.from(totalsByCurrency.entries())
    .toSorted(([leftCurrency], [rightCurrency]) =>
      leftCurrency.localeCompare(rightCurrency),
    )
    .map(([currency, totalMinor]) => formatMoney(totalMinor, currency))
    .join(" / ");
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
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-stone-100">
        <Icon className="size-5 text-stone-700" />
      </div>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-950">{value}</p>
    </div>
  );
}
