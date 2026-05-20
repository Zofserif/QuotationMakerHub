import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LinkButton } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-config";
import { UPGRADE_CONTACT_EMAIL } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Contact | ${APP_NAME}`,
  description:
    "Contact Remote Quote for product questions, partner plan inquiries, and quotation workflow support.",
  alternates: {
    canonical: "/contact",
  },
};

const contactMailHref = UPGRADE_CONTACT_EMAIL
  ? `mailto:${encodeURIComponent(UPGRADE_CONTACT_EMAIL)}?subject=${encodeURIComponent(
      "Remote Quote inquiry",
    )}`
  : "";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link className="inline-flex items-center gap-2 font-semibold text-stone-950" href="/">
          <BrandLogo className="size-7" />
          {APP_NAME}
        </Link>
        <section className="mt-12 rounded-md border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
            <Mail aria-hidden="true" className="size-6" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Contact
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            Talk to Remote Quote
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
            For product questions, partner plan inquiries, or help choosing the right quotation
            workflow, contact the Remote Quote team.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {contactMailHref ? (
              <a
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-base font-medium transition-colors",
                  "bg-stone-950 text-white hover:bg-stone-800",
                )}
                href={contactMailHref}
              >
                Email {UPGRADE_CONTACT_EMAIL}
                <ArrowRight className="size-5" />
              </a>
            ) : (
              <p className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
                Public contact email is not configured yet. Signed-in workspaces can use the
                dashboard support options when available.
              </p>
            )}
            <LinkButton href="/dashboard" size="lg" variant="secondary">
              Open dashboard
              <ArrowRight className="size-5" />
            </LinkButton>
          </div>
        </section>
      </div>
    </main>
  );
}
