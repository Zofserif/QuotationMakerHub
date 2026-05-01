import { notFound } from "next/navigation";

import { LinkButton } from "@/components/ui/button";
import { QuotePreview } from "@/components/quote-editor/quote-preview";
import { requireQuoter } from "@/lib/auth/require-quoter";
import {
  getQuote,
  getQuoteTemplate,
  listQuoteDocumentSignatures,
  listQuoteVersions,
} from "@/lib/quotes/persistence";

export const dynamic = "force-dynamic";

export default async function PreviewQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const quoter = await requireQuoter();
  const [quote, template] = await Promise.all([
    getQuote(quoter, quoteId),
    getQuoteTemplate(quoter),
  ]);

  if (!quote) {
    notFound();
  }

  const versions = await listQuoteVersions(quoter, quote.id);
  const latestVersion = versions.at(-1);
  const clientSignatures = latestVersion
    ? await listQuoteDocumentSignatures(quoter, quote.id, latestVersion.id)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <section>
          <p className="text-sm font-medium text-stone-500">
            Quote preview · {quote.quoteNumber}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-stone-950">
            {quote.quotationName}
          </h1>
        </section>
        {quote.status !== "locked" ? (
          <LinkButton href={`/quotes/${quote.id}/edit`} variant="secondary">
            Back to editor
          </LinkButton>
        ) : null}
      </div>
      <QuotePreview
        quote={quote}
        template={template}
        clientSignatures={clientSignatures}
        snapshot={latestVersion?.snapshot}
        latestSnapshotSha256={latestVersion?.snapshotSha256}
        latestVersionNumber={latestVersion?.versionNumber}
      />
    </div>
  );
}
