import { LineItemDataManager } from "@/components/line-item-data/line-item-data-manager";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { listLineItemData, getQuoteTemplate } from "@/lib/quotes/persistence";

export const dynamic = "force-dynamic";

export default async function LineItemDataPage() {
  const quoter = await requireQuoter();
  const [lineItemData, template] = await Promise.all([
    listLineItemData(quoter),
    getQuoteTemplate(quoter),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">Library</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Line Item Data
        </h1>
      </section>
      <LineItemDataManager
        initialItems={lineItemData}
        unitOptions={template.lineItems.unit.options}
      />
    </div>
  );
}
