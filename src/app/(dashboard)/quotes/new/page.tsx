import { UpgradePanel } from "@/components/billing/upgrade-panel";
import { QuoteEditor } from "@/components/quote-editor/quote-editor";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  getQuoteTemplate,
  listLineItemData,
  listQuoteTemplates,
} from "@/lib/quotes/persistence";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const quoter = await requireQuoter();
  const [template, lineItemData, entitlement, templates] = await Promise.all([
    getQuoteTemplate(quoter),
    listLineItemData(quoter),
    getWorkspaceEntitlement(quoter),
    listQuoteTemplates(quoter),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">Draft</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Create quotation
        </h1>
      </section>
      {!entitlement.canCreateQuote ? (
        <UpgradePanel
          entitlement={entitlement}
          title="Free trial ended"
          message="Upgrade to a partner package to create more quotations in this workspace."
        />
      ) : (
        <QuoteEditor
          template={template}
          templates={templates}
          canManageMultipleTemplates={entitlement.canManageMultipleTemplates}
          lineItemData={lineItemData}
        />
      )}
    </div>
  );
}
