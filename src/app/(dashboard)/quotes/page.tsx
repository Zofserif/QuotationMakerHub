import { QuoteList } from "@/components/dashboard/quote-list";
import { listDemoQuotes } from "@/lib/demo/store";
import type { QuoteStatus } from "@/lib/quotes/types";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: QuoteStatus }>;
}) {
  const { status } = await searchParams;
  const quotes = listDemoQuotes().filter((quote) =>
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
      <QuoteList quotes={quotes} />
    </div>
  );
}
