import { Activity, Edit3, Eye, FileText } from "lucide-react";

import { QuoteSharePanel } from "@/components/quote-share/quote-share-panel";
import { LinkButton } from "@/components/ui/button";
import { QuoteStatusBadge } from "@/components/dashboard/quote-status-badge";
import { QuoteVisibilityActions } from "@/components/dashboard/quote-visibility-actions";
import {
  buildQuoteShareLinks,
  buildUnavailableQuoteShareLinks,
} from "@/lib/quotes/share-links";
import type { Quote } from "@/lib/quotes/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function QuoteList({
  emptyMessage = "No quotations yet.",
  quotes,
}: {
  emptyMessage?: string;
  quotes: Quote[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_1fr] gap-4 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 max-lg:hidden">
        <span>Quote</span>
        <span>Client</span>
        <span>Status</span>
        <span>Total</span>
        <span className="text-right">Actions</span>
      </div>
      <div className="divide-y divide-stone-200">
        {quotes.length > 0 ? (
          quotes.map((quote) => (
            <article
              className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_1fr] lg:items-center"
              key={quote.id}
            >
              <div>
                <p className="font-semibold text-stone-950">
                  {quote.quotationName}
                </p>
                <p className="text-sm text-stone-500">
                  {quote.quoteNumber} · {quote.title} · updated{" "}
                  {formatDate(quote.updatedAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {quote.client.contactName}
                </p>
                <p className="text-sm text-stone-500">{quote.client.email}</p>
              </div>
              <QuoteStatusBadge status={quote.status} />
              <p className="font-semibold text-stone-950">
                {formatMoney(quote.totalMinor, quote.currency)}
              </p>
              <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                {quote.status !== "locked" ? (
                  <LinkButton
                    href={`/quotes/${quote.id}/edit`}
                    variant="secondary"
                    size="sm"
                  >
                    <Edit3 className="size-4" />
                    Edit
                  </LinkButton>
                ) : null}
                <LinkButton
                  href={`/quotes/${quote.id}/preview`}
                  variant="secondary"
                  size="sm"
                >
                  <Eye className="size-4" />
                  Preview
                </LinkButton>
                <LinkButton
                  href={`/quotes/${quote.id}/activity`}
                  variant="secondary"
                  size="sm"
                >
                  <Activity className="size-4" />
                  Activity
                </LinkButton>
                <LinkButton
                  href={
                    quote.status === "locked"
                      ? `/print/quotes/${quote.id}`
                      : `/print/quotes/${quote.id}?signature=wet`
                  }
                  variant="primary"
                  size="sm"
                >
                  <FileText className="size-4" />
                  PDF
                </LinkButton>
                <QuoteVisibilityActions
                  quoteId={quote.id}
                  visibility={quote.visibility}
                />
              </div>
              {quote.visibility === "active" ? (
                <QuoteSharePanel
                  quoteId={quote.id}
                  quoteStatus={quote.status}
                  initialShareLinks={buildQuoteShareLinks(quote)}
                  initialUnavailableShareLinks={buildUnavailableQuoteShareLinks(
                    quote,
                  )}
                  variant="compact"
                  className="lg:col-span-5"
                />
              ) : null}
            </article>
          ))
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="font-medium text-stone-900">{emptyMessage}</p>
            <p className="mt-1 text-sm text-stone-500">
              Matching quotations will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
