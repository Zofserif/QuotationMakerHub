import { FileSignature, FileText, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AccountIndicator } from "@/components/dashboard/account-indicator";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { isClerkConfigured } from "@/lib/auth/clerk";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const hasClerk = isClerkConfigured();

  return (
    <main className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2 font-semibold text-stone-950" href="/dashboard">
            <FileSignature className="size-5" />
            Quotation Maker Hub
          </Link>
          <div className="flex min-w-0 flex-col gap-3 sm:items-end">
            {hasClerk ? (
              <AccountIndicator />
            ) : (
              <Badge className="w-fit bg-stone-100 text-stone-700">
                Demo account
              </Badge>
            )}
            <nav className="flex flex-wrap items-center gap-2">
              <LinkButton href="/dashboard" variant="secondary" size="sm">
                <LayoutDashboard className="size-4" />
                Dashboard
              </LinkButton>
              <LinkButton href="/quote-template" variant="secondary" size="sm">
                <FileText className="size-4" />
                Quote Template
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
