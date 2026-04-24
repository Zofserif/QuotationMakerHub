import { notFound } from "next/navigation";

import { QuoteDocument } from "@/components/quote-editor/quote-document";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getQuote, listQuoteVersions } from "@/lib/quotes/persistence";
import { formatDate } from "@/lib/utils";

export default async function PrintQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { quoteId } = await params;
  const { version } = await searchParams;
  const quoter = await requireQuoter();
  const quote = await getQuote(quoter, quoteId);

  if (!quote) {
    notFound();
  }

  const versions = await listQuoteVersions(quoter, quote.id);
  const selectedVersion =
    versions.find((candidate) => String(candidate.versionNumber) === version) ??
    versions.at(-1);
  const snapshot = selectedVersion?.snapshot;

  if (!snapshot) {
    notFound();
  }

  return (
    <main className="bg-white p-8 text-stone-950 print:p-0">
      <div className="mx-auto max-w-4xl">
        <QuoteDocument
          snapshot={snapshot}
          headerSuffix={`version ${selectedVersion.versionNumber}`}
        />

        <section className="border-t border-stone-300 pt-6">
          <h2 className="font-semibold">Acceptance metadata</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {quote.recipients.map((recipient) => (
              <div className="rounded-md border border-stone-200 p-3" key={recipient.id}>
                <dt className="font-medium">{recipient.name}</dt>
                <dd className="text-stone-600">{recipient.email}</dd>
                <dd className="mt-2">
                  Status: {recipient.status}
                  {recipient.acceptedAt
                    ? ` · accepted ${formatDate(recipient.acceptedAt)}`
                    : ""}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 break-all text-xs text-stone-500">
            Snapshot SHA-256: {selectedVersion.snapshotSha256}
          </p>
        </section>
      </div>
    </main>
  );
}
