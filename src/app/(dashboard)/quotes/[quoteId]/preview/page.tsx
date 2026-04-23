import { notFound } from "next/navigation";

import { LinkButton } from "@/components/ui/button";
import { QuotePreview } from "@/components/quote-editor/quote-preview";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getQuote } from "@/lib/quotes/persistence";

export const dynamic = "force-dynamic";

export default async function PreviewQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const quoter = await requireQuoter();
  const quote = await getQuote(quoter, quoteId);

  if (!quote) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <section>
          <p className="text-sm font-medium text-stone-500">
            {quote.quoteNumber}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-stone-950">
            Quote preview
          </h1>
        </section>
        <LinkButton href={`/quotes/${quote.id}/edit`} variant="secondary">
          Back to editor
        </LinkButton>
      </div>
      <QuotePreview quote={quote} />
    </div>
  );
}
