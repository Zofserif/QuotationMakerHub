import { PenLine } from "lucide-react";

import { QuoteSharePanel } from "@/components/quote-share/quote-share-panel";
import { QuoteAcceptanceMetadata } from "@/components/quote-editor/quote-acceptance-metadata";
import { QuoteDocument } from "@/components/quote-editor/quote-document";
import { SignatureFieldConfig } from "@/components/quote-editor/signature-field-config";
import { mergeQuoteTemplate } from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import { createVersionSnapshot } from "@/lib/quotes/create-version-snapshot";
import {
  buildQuoteShareLinks,
  buildUnavailableQuoteShareLinks,
} from "@/lib/quotes/share-links";
import type { Quote, QuoteDocumentSignature } from "@/lib/quotes/types";

export function QuotePreview({
  quote,
  template,
  clientSignatures,
  latestSnapshotSha256,
  latestVersionNumber,
}: {
  quote: Quote;
  template?: QuoteTemplate;
  clientSignatures?: QuoteDocumentSignature[];
  latestSnapshotSha256?: string;
  latestVersionNumber?: number;
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
        initialUnavailableShareLinks={buildUnavailableQuoteShareLinks(quote)}
      />

      <QuoteDocument snapshot={snapshot} clientSignatures={clientSignatures} />

      <QuoteAcceptanceMetadata
        recipients={quote.recipients}
        snapshotSha256={latestSnapshotSha256}
        versionNumber={latestVersionNumber}
      />

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
