import { PenLine } from "lucide-react";

import { QuoteTotalsView } from "@/components/quote-editor/quote-totals";
import { SignatureFieldConfig } from "@/components/quote-editor/signature-field-config";
import type { Quote } from "@/lib/quotes/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function QuotePreview({ quote }: { quote: Quote }) {
  return (
    <div className="bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
      <header className="flex flex-col gap-6 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">
            {quote.quoteNumber}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-stone-950">
            {quote.title}
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Valid until {formatDate(quote.validUntil)}
          </p>
        </div>
        <div className="text-sm text-stone-600 sm:text-right">
          <p className="font-semibold text-stone-950">Quotation Maker Hub</p>
          <p>quotes@example.com</p>
          <p>MVP business profile placeholder</p>
        </div>
      </header>

      <section className="grid gap-6 border-b border-stone-200 py-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Prepared for
          </h2>
          <p className="mt-2 font-semibold text-stone-950">
            {quote.client.companyName || quote.client.contactName}
          </p>
          <p className="text-sm text-stone-600">{quote.client.contactName}</p>
          <p className="text-sm text-stone-600">{quote.client.email}</p>
        </div>
        <QuoteTotalsView totals={quote} currency={quote.currency} />
      </section>

      <section className="py-6">
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <div className="grid grid-cols-[1.4fr_0.4fr_0.6fr_0.6fr] gap-4 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <span>Item</span>
            <span>Qty</span>
            <span>Unit</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-stone-200">
            {quote.lineItems.map((lineItem) => (
              <div
                className="grid grid-cols-[1.4fr_0.4fr_0.6fr_0.6fr] gap-4 px-4 py-4 text-sm"
                key={lineItem.id}
              >
                <div>
                  <p className="font-medium text-stone-950">{lineItem.name}</p>
                  <p className="mt-1 text-stone-500">{lineItem.description}</p>
                </div>
                <span>{lineItem.quantity}</span>
                <span>
                  {formatMoney(lineItem.unitPriceMinor, quote.currency)}
                </span>
                <span className="text-right font-semibold">
                  {formatMoney(lineItem.lineTotalMinor, quote.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 border-t border-stone-200 py-6 md:grid-cols-2">
        <div>
          <h2 className="font-semibold text-stone-950">Terms</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
            {quote.terms || "No terms provided."}
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-stone-950">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
            {quote.notes || "No notes provided."}
          </p>
        </div>
      </section>

      <section className="border-t border-stone-200 pt-6">
        <div className="mb-3 flex items-center gap-2">
          <PenLine className="size-4 text-stone-500" />
          <h2 className="font-semibold text-stone-950">Signature fields</h2>
        </div>
        <SignatureFieldConfig
          fields={quote.signatureFields}
          recipients={quote.recipients}
        />
      </section>
    </div>
  );
}
