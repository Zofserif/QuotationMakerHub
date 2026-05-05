import { Mail, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import type { WorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  buildUpgradeMailto,
  partnerPackages,
  UPGRADE_CONTACT_EMAIL,
} from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";

export function UpgradeLink({
  entitlement,
  size = "sm",
}: {
  entitlement: WorkspaceEntitlement;
  size?: "sm" | "md";
}) {
  const href = buildUpgradeMailto({
    workspaceRef: entitlement.workspaceRef,
    requesterEmail: entitlement.requesterEmail,
    requesterUserId: entitlement.requesterUserId,
    currentPlan: entitlement.plan,
  });

  if (!href) {
    return (
      <Button type="button" variant="secondary" size={size} disabled>
        <Mail className="size-4" />
        Upgrade
      </Button>
    );
  }

  return (
    <LinkButton href={href} variant="primary" size={size}>
      <Sparkles className="size-4" />
      Upgrade to partner
    </LinkButton>
  );
}

export function UpgradePanel({
  entitlement,
  title = "Upgrade to partner",
  message = "Choose a partner package to remove free-trial limits.",
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
            className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            key={partnerPackage.plan}
          >
            <h3 className="font-semibold text-stone-950">
              {partnerPackage.name}
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {partnerPackage.description}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {partnerPackage.features.map((feature) => (
                <li className="flex gap-2" key={feature}>
                  <span aria-hidden="true" className="text-stone-400">
                    -
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {!UPGRADE_CONTACT_EMAIL ? (
        <p className="mt-3 text-sm font-medium text-amber-700">
          Configure NEXT_PUBLIC_UPGRADE_CONTACT_EMAIL to enable the upgrade
          email button.
        </p>
      ) : null}
    </section>
  );
}
