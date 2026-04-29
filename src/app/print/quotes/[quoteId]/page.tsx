import { notFound } from "next/navigation";

import { QuoteDocument } from "@/components/quote-editor/quote-document";
import { QuotePrintToolbar } from "@/components/quote-editor/quote-print-toolbar";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { mergeQuoteTemplate } from "@/lib/quote-templates/defaults";
import { createVersionSnapshot } from "@/lib/quotes/create-version-snapshot";
import {
  getQuote,
  getQuoteTemplate,
  listQuoteDocumentSignatures,
  listQuoteVersions,
} from "@/lib/quotes/persistence";
import {
  getQuotePaperSizeOption,
  parseQuotePaperSize,
  parseQuoteSignatureMode,
} from "@/lib/quotes/print-options";

export default async function PrintQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{
    paper?: string;
    signature?: string;
    version?: string;
  }>;
}) {
  const { quoteId } = await params;
  const { paper, signature, version } = await searchParams;
  const paperSize = parseQuotePaperSize(paper);
  const paperOption = getQuotePaperSizeOption(paperSize);
  const quoter = await requireQuoter();
  const quote = await getQuote(quoter, quoteId);

  if (!quote) {
    notFound();
  }

  const versions = await listQuoteVersions(quoter, quote.id);
  const selectedVersion =
    versions.find((candidate) => String(candidate.versionNumber) === version) ??
    versions.at(-1);
  const template = selectedVersion ? undefined : await getQuoteTemplate(quoter);
  const snapshot =
    selectedVersion?.snapshot ??
    createVersionSnapshot(
      quote,
      mergeQuoteTemplate(quote.templateSnapshot ?? template),
    );
  const allowSignatureModeToggle = quote.status === "locked";
  const signatureMode = allowSignatureModeToggle
    ? parseQuoteSignatureMode(signature)
    : "wet";

  if (!snapshot) {
    notFound();
  }

  const clientSignatures = selectedVersion
    ? await listQuoteDocumentSignatures(quoter, quote.id, selectedVersion.id)
    : undefined;

  return (
    <main className="bg-stone-100 p-6 text-stone-950 print:bg-white print:p-0">
      <style>
        {`@media print { @page { size: ${paperOption.cssSize}; margin: 0.5in; } }`}
      </style>

      <div className="mx-auto max-w-5xl space-y-4">
        <QuotePrintToolbar
          allowSignatureModeToggle={allowSignatureModeToggle}
          paperSize={paperSize}
          quoteId={quote.id}
          signatureMode={signatureMode}
          versionNumber={selectedVersion?.versionNumber}
        />

        <div
          className="mx-auto bg-white p-4 shadow-sm ring-1 ring-stone-200 print:p-0 print:shadow-none print:ring-0"
          style={{ maxWidth: paperOption.previewWidth }}
        >
          <QuoteDocument
            snapshot={snapshot}
            headerSuffix={
              selectedVersion
                ? `version ${selectedVersion.versionNumber}`
                : "live draft"
            }
            clientSignatures={clientSignatures}
            signatureMode={signatureMode}
            variant="print"
          />
        </div>
      </div>
    </main>
  );
}
