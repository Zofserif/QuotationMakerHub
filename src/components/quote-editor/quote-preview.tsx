import { PenLine } from "lucide-react";

import { QuoteTotalsView } from "@/components/quote-editor/quote-totals";
import { SignatureFieldConfig } from "@/components/quote-editor/signature-field-config";
import { MarkdownText } from "@/components/ui/markdown-text";
import { getLineItemImageSrc } from "@/lib/line-item-data/images";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { Quote } from "@/lib/quotes/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function QuotePreview({
  quote,
  template,
}: {
  quote: Quote;
  template?: QuoteTemplate;
}) {
  const business: {
    name: string;
    email: string;
    address: string;
    logoDataUrl?: string;
    telephone?: string;
    phone?: string;
    vatRegTin?: string;
  } = template
    ? {
        name: template.company.name.enabled ? template.company.name.value : "",
        email: template.company.email.enabled ? template.company.email.value : "",
        address: template.company.address,
        logoDataUrl:
          template.logo.enabled && template.logo.dataUrl
            ? template.logo.dataUrl
            : undefined,
        telephone: template.company.telephone.enabled
          ? template.company.telephone.value
          : undefined,
        phone: template.company.phone.enabled
          ? template.company.phone.value
          : undefined,
        vatRegTin: template.company.vatRegTin.enabled
          ? template.company.vatRegTin.value
          : undefined,
      }
    : {
        name: "Quotation Maker Hub",
        email: "quotes@example.com",
        address: "MVP business profile placeholder",
      };

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
          {business.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Company logo"
              className="mb-3 h-16 w-full object-contain sm:ml-auto sm:w-40"
              src={business.logoDataUrl}
            />
          ) : null}
          {business.name ? (
            <p className="font-semibold text-stone-950">{business.name}</p>
          ) : null}
          {business.email ? <p>{business.email}</p> : null}
          <p>{business.address}</p>
          {business.telephone ? <p>{business.telephone}</p> : null}
          {business.phone ? <p>{business.phone}</p> : null}
          {business.vatRegTin ? <p>{business.vatRegTin}</p> : null}
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
          <div className="grid grid-cols-[1.4fr_0.35fr_0.45fr_0.65fr_0.65fr] gap-4 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <span>Item</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Unit Price</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-stone-200">
            {quote.lineItems.map((lineItem) => {
              const imageSrc = getLineItemImageSrc(lineItem);

              return (
                <div
                  className="grid grid-cols-[1.4fr_0.35fr_0.45fr_0.65fr_0.65fr] gap-4 px-4 py-4 text-sm"
                  key={lineItem.id}
                >
                  <div>
                    {template?.lineItems.showDescriptionPicture && imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="mb-3 h-32 w-full rounded-md border border-stone-200 object-cover"
                        src={imageSrc}
                      />
                    ) : null}
                    <p className="font-medium text-stone-950">{lineItem.name}</p>
                    <MarkdownText
                      className="mt-1 text-stone-500"
                      value={lineItem.description}
                    />
                  </div>
                  <span>{lineItem.quantity}</span>
                  <span>{lineItem.unit || "Unit"}</span>
                  <span>
                    {formatMoney(lineItem.unitPriceMinor, quote.currency)}
                  </span>
                  <span className="text-right font-semibold">
                    {formatMoney(lineItem.lineTotalMinor, quote.currency)}
                  </span>
                </div>
              );
            })}
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
