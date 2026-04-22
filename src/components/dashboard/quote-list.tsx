import { Activity, Edit3, Eye, FileText, Send } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { QuoteStatusBadge } from "@/components/dashboard/quote-status-badge";
import type { Quote } from "@/lib/quotes/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function QuoteList({ quotes }: { quotes: Quote[] }) {
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
        {quotes.map((quote) => {
          const signingToken = quote.recipients.find(
            (recipient) => recipient.accessToken,
          )?.accessToken;

          return (
            <article
              className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_1fr] lg:items-center"
              key={quote.id}
            >
              <div>
                <p className="font-semibold text-stone-950">{quote.title}</p>
                <p className="text-sm text-stone-500">
                  {quote.quoteNumber} · updated {formatDate(quote.updatedAt)}
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
                <LinkButton
                  href={`/quotes/${quote.id}/edit`}
                  variant="secondary"
                  size="sm"
                >
                  <Edit3 className="size-4" />
                  Edit
                </LinkButton>
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
                {signingToken && quote.status !== "locked" ? (
                  <LinkButton
                    href={`/sign/${signingToken}`}
                    variant="primary"
                    size="sm"
                  >
                    <Send className="size-4" />
                    Sign Link
                  </LinkButton>
                ) : null}
                {quote.status === "locked" ? (
                  <LinkButton
                    href={`/print/quotes/${quote.id}`}
                    variant="primary"
                    size="sm"
                  >
                    <FileText className="size-4" />
                    PDF
                  </LinkButton>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
