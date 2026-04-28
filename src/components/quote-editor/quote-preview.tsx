import { PenLine } from "lucide-react";

import { QuoteSharePanel } from "@/components/quote-share/quote-share-panel";
import { QuoteDocument } from "@/components/quote-editor/quote-document";
import { SignatureFieldConfig } from "@/components/quote-editor/signature-field-config";
import { mergeQuoteTemplate } from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import { createVersionSnapshot } from "@/lib/quotes/create-version-snapshot";
import { buildQuoteShareLinks } from "@/lib/quotes/share-links";
import type { Quote } from "@/lib/quotes/types";

export function QuotePreview({
  quote,
  template,
}: {
  quote: Quote;
  template?: QuoteTemplate;
}) {
  const snapshot = createVersionSnapshot(
    quote,
    mergeQuoteTemplate(quote.templateSnapshot ?? template),
  );

  return (
    <div className="space-y-6">
      <QuoteSharePanel
        quoteId={quote.id}
        quoteStatus={quote.status}
        initialShareLinks={buildQuoteShareLinks(quote)}
      />

      <QuoteDocument snapshot={snapshot} />

      <section className="bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
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
