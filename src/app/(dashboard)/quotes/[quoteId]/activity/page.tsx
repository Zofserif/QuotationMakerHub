import { notFound } from "next/navigation";

import { QuoteStatusBadge } from "@/components/dashboard/quote-status-badge";
import { getDemoAuditEvents, getDemoQuote } from "@/lib/demo/store";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuoteActivityPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const quote = getDemoQuote(quoteId);

  if (!quote) {
    notFound();
  }

  const events = getDemoAuditEvents(quote.id).toReversed();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">
            {quote.quoteNumber}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-stone-950">
            Audit activity
          </h1>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </section>
      <div className="rounded-lg border border-stone-200 bg-white">
        {events.map((event) => (
          <article
            className="grid gap-3 border-b border-stone-200 px-4 py-4 last:border-b-0 sm:grid-cols-[200px_1fr_160px]"
            key={event.id}
          >
            <p className="text-sm text-stone-500">{formatDate(event.createdAt)}</p>
            <div>
              <p className="font-medium text-stone-950">{event.eventType}</p>
              <p className="text-sm text-stone-500">
                {event.actorType} {event.actorRef ? `· ${event.actorRef}` : ""}
              </p>
            </div>
            <pre className="overflow-hidden rounded-md bg-stone-50 p-2 text-xs text-stone-600">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
