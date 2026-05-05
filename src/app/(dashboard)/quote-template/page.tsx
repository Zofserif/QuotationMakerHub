import { QuoteTemplateDesigner } from "@/components/quote-template/quote-template-designer";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  getQuoteTemplate,
  listQuoteTemplates,
} from "@/lib/quotes/persistence";

export const dynamic = "force-dynamic";

export default async function QuoteTemplatePage() {
  const quoter = await requireQuoter();
  const [template, templates, entitlement] = await Promise.all([
    getQuoteTemplate(quoter),
    listQuoteTemplates(quoter),
    getWorkspaceEntitlement(quoter),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">Designer</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Quote Template
        </h1>
      </section>
      <QuoteTemplateDesigner
        template={template}
        templates={templates}
        canManageMultipleTemplates={entitlement.canManageMultipleTemplates}
        entitlement={entitlement}
      />
    </div>
  );
}
