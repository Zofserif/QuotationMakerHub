import { QuoteEditor } from "@/components/quote-editor/quote-editor";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getQuoteTemplate, listLineItemData } from "@/lib/quotes/persistence";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const quoter = await requireQuoter();
  const [template, lineItemData] = await Promise.all([
    getQuoteTemplate(quoter),
    listLineItemData(quoter),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">Draft</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Create quotation
        </h1>
      </section>
      <QuoteEditor template={template} lineItemData={lineItemData} />
    </div>
  );
}
