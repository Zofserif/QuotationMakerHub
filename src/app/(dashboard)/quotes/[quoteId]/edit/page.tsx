import { notFound } from "next/navigation";

import { QuoteEditor } from "@/components/quote-editor/quote-editor";
import { getDemoQuote } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const quote = getDemoQuote(quoteId);

  if (!quote) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">{quote.quoteNumber}</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Edit quotation
        </h1>
      </section>
      <QuoteEditor quote={quote} />
    </div>
  );
}
