import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME } from "@/lib/app-config";
import { UPGRADE_CONTACT_EMAIL } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: `Terms of Service | ${APP_NAME}`,
  description:
    "Starter terms for using Remote Quote to create quotations, share approval links, and collect signatures.",
  alternates: {
    canonical: "/terms",
  },
};

const termsSections = [
  {
    title: "Using Remote Quote",
    body: [
      "Remote Quote provides tools for creating structured quotations, managing quote records, generating client approval links, and collecting signatures.",
      "You are responsible for keeping your account secure and for making sure each quotation is accurate before sharing it with a client.",
    ],
  },
  {
    title: "Quotation responsibility",
    body: [
      "You are responsible for the prices, taxes, discounts, scope, terms, notes, and business commitments included in your quotations.",
      "Remote Quote does not provide legal, tax, accounting, or professional advice.",
    ],
  },
  {
    title: "Electronic signatures",
    body: [
      "Remote Quote can help capture browser-based signatures and store acceptance records for quotation workflows.",
      "You are responsible for confirming that electronic signatures and approval workflows are appropriate for your client, location, and transaction.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not use Remote Quote to upload unlawful content, misrepresent pricing or scope, infringe another party's rights, attack the service, or interfere with other users.",
      "We may restrict access when needed to protect the product, users, clients, or service providers.",
    ],
  },
  {
    title: "Trials and partner plans",
    body: [
      "Free trial and partner plan limits may apply to quotations, locked records, wet-signature printing, templates, teams, and related workspace features.",
      "Plan details can change as the product evolves. Any paid upgrade terms should be confirmed through the official Remote Quote payment or contact process.",
    ],
  },
  {
    title: "Availability and limitations",
    body: [
      "Remote Quote is provided as an online service and may change, pause, or become unavailable from time to time.",
      "To the fullest extent allowed by law, Remote Quote is not liable for indirect, incidental, special, or consequential losses related to use of the service.",
    ],
  },
  {
    title: "Contact",
    body: [
      UPGRADE_CONTACT_EMAIL
        ? `For terms questions, contact ${UPGRADE_CONTACT_EMAIL}.`
        : "For terms questions, contact the Remote Quote team through your configured support or account channel.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link className="inline-flex items-center gap-2 font-semibold text-stone-950" href="/">
          <BrandLogo className="size-7" />
          {APP_NAME}
        </Link>
        <div className="mt-12">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-5 text-base leading-7 text-stone-600">
            Last updated: May 19, 2026. These starter terms outline the baseline rules for using
            Remote Quote.
          </p>
        </div>
        <div className="mt-10 space-y-6">
          {termsSections.map((section) => (
            <section
              className="rounded-md border border-stone-200 bg-white p-6 shadow-sm"
              key={section.title}
            >
              <h2 className="text-xl font-semibold text-stone-950">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
