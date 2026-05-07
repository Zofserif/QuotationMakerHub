import { Database, FileText, LayoutDashboard, Plus, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { PlanBadgeButton } from "@/components/billing/billing-actions";
import { AccountIndicator } from "@/components/dashboard/account-indicator";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-config";
import { isClerkConfigured } from "@/lib/auth/clerk";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const hasClerk = isClerkConfigured();
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  return (
    <main className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link
            className="flex items-center gap-2 font-semibold text-stone-950"
            href="/dashboard"
          >
            <BrandLogo className="size-6" />
            {APP_NAME}
          </Link>

          <div className="flex min-w-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <PlanBadgeButton entitlement={entitlement} />

              {hasClerk ? (
                <>
                  <WorkspaceSwitcher />
                  <AccountIndicator />
                </>
              ) : (
                <Badge className="w-fit bg-stone-100 text-stone-700">
                  Demo account
                </Badge>
              )}
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              <LinkButton href="/dashboard" variant="secondary" size="sm">
                <LayoutDashboard className="size-4" />
                Dashboard
              </LinkButton>
              <LinkButton href="/quote-template" variant="secondary" size="sm">
                <FileText className="size-4" />
                Quote Template
              </LinkButton>
              <LinkButton href="/line-item-data" variant="secondary" size="sm">
                <Database className="size-4" />
                Line Item Data
              </LinkButton>
              <LinkButton href="/team" variant="secondary" size="sm">
                <Users className="size-4" />
                Team
              </LinkButton>
              <LinkButton href="/quotes/new" size="sm">
                <Plus className="size-4" />
                New quote
              </LinkButton>
            </nav>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
