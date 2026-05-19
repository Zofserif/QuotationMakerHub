import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME } from "@/lib/app-config";
import { UPGRADE_CONTACT_EMAIL } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: `Privacy Policy | ${APP_NAME}`,
  description:
    "How Remote Quote handles account data, quotation data, signatures, analytics, and service providers.",
  alternates: {
    canonical: "/privacy",
  },
};

const privacySections = [
  {
    title: "Information we handle",
    body: [
      "Remote Quote may process account and workspace information, quotation details, recipient details, line items, notes, terms, signatures, audit activity, and support messages you choose to send.",
      "If you sign in through the product, authentication and workspace identity may be provided by Clerk. Quote storage, signature records, and related application data may be stored through Supabase.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use information to operate the quotation workflow, maintain quote records, generate client approval links, support workspace access, troubleshoot issues, and improve product reliability.",
      "We do not need sensitive quote text for analytics. Product analytics are configured to avoid sending sensitive quotation content.",
    ],
  },
  {
    title: "Signatures and client quote data",
    body: [
      "Client signatures and quote records are handled so a quotation can be reviewed, accepted, locked, audited, and retrieved by authorized users.",
      "You are responsible for making sure you have the right to upload, store, and share client information through Remote Quote.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "Remote Quote may use service providers such as Clerk for authentication, Supabase for database and storage infrastructure, PostHog for privacy-conscious product analytics, and notification tools for support workflows.",
      "These providers process information only as needed to provide their services to Remote Quote.",
    ],
  },
  {
    title: "Retention and security",
    body: [
      "We keep information for as long as needed to provide the product, maintain business records, resolve disputes, and meet operational or legal requirements.",
      "We use reasonable technical and organizational safeguards, but no online service can guarantee absolute security.",
    ],
  },
  {
    title: "Contact",
    body: [
      UPGRADE_CONTACT_EMAIL
        ? `For privacy questions, contact ${UPGRADE_CONTACT_EMAIL}.`
        : "For privacy questions, contact the Remote Quote team through your configured support or account channel.",
    ],
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-5 text-base leading-7 text-stone-600">
            Last updated: May 19, 2026. This starter policy explains the information Remote Quote
            handles to provide the quotation workflow.
          </p>
        </div>
        <div className="mt-10 space-y-6">
          {privacySections.map((section) => (
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
