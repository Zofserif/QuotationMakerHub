import { FileSignature, Send, ShieldCheck, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

import { QuoteList } from "@/components/dashboard/quote-list";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { listQuotes } from "@/lib/quotes/persistence";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const quoter = await requireQuoter();
  const quotes = await listQuotes(quoter);
  const sentCount = quotes.filter((quote) => quote.status !== "draft").length;
  const acceptedCount = quotes.filter((quote) =>
    ["accepted", "locked"].includes(quote.status),
  ).length;
  const totalPipeline = quotes.reduce((sum, quote) => sum + quote.totalMinor, 0);

  if (quotes.length === 0) {
    redirect("/quotes/new");
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">Workspace</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Quote dashboard
        </h1>
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
          value={formatMoney(totalPipeline)}
        />
      </section>

      <QuoteList quotes={quotes} />
    </div>
  );
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
