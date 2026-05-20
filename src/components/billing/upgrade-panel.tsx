import { UpgradeModalButton } from "@/components/billing/billing-actions";
import {
  PaidPlanSupportBlock,
  PricingPlanSections,
} from "@/components/billing/pricing-plan-sections";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceEntitlement } from "@/lib/billing/entitlements";
import { paidPlanSupportDetails, partnerPackages } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";

export function UpgradeLink({
  entitlement,
  size = "sm",
}: {
  entitlement: WorkspaceEntitlement;
  size?: "sm" | "md";
}) {
  return <UpgradeModalButton entitlement={entitlement} size={size} />;
}

export function UpgradePanel({
  entitlement,
  title = "Book an upgrade call",
  message = "Choose a partner plan to remove free-trial limits.",
}: {
  entitlement: WorkspaceEntitlement;
  title?: string;
  message?: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
            <Badge>{entitlement.planLabel}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-stone-600">{message}</p>
          {entitlement.trialEndsAt ? (
            <p className="mt-1 text-sm text-stone-500">
              Trial ends {formatDate(entitlement.trialEndsAt)}.
            </p>
          ) : null}
        </div>
        <UpgradeLink entitlement={entitlement} size="md" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {partnerPackages.map((partnerPackage) => (
          <article
            className="flex min-w-0 flex-col rounded-lg border border-stone-200 bg-stone-50 p-4"
            key={partnerPackage.plan}
          >
            <h3 className="font-semibold text-stone-950">
              {partnerPackage.name}
            </h3>
            {partnerPackage.price ? (
              <p className="mt-1 text-xl font-bold text-stone-950">
                {partnerPackage.price}
              </p>
            ) : null}
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {partnerPackage.description}
            </p>
            <PricingPlanSections className="flex-1" plan={partnerPackage} />
          </article>
        ))}
      </div>

      <PaidPlanSupportBlock className="mt-4" support={paidPlanSupportDetails} />
    </section>
  );
}
