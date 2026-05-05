import { ArrowRight, Send, CheckCircle2, Form } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LinkButton } from "@/components/ui/button";
import {
  APP_AUTHOR_NAME,
  APP_DESCRIPTION,
  APP_NAME,
  APP_ORIGIN,
  APP_PUBLISHED_DATE,
  APP_SOCIAL_PREVIEW_IMAGE_SRC,
} from "@/lib/app-config";

const landingSteps = [
  { label: "Create Your Quote", icon: Form },
  { label: "Send to Client", icon: Send },
  { label: "Signature in minutes", icon: CheckCircle2 },
];

function SignatureCue({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 160 40"
    >
      <path
        className="signature-cue__stroke"
        d="M6 28 C18 12, 28 10, 32 22 C36 35, 46 33, 54 17 C59 7, 63 9, 62 21 C61 35, 72 32, 82 22 C91 13, 98 14, 96 25 C94 35, 108 31, 119 19 C130 8, 143 13, 154 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        className="signature-cue__underline"
        d="M18 34 C48 38, 100 38, 145 31"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const homepageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: APP_NAME,
  description: APP_DESCRIPTION,
  ...(APP_ORIGIN
    ? {
        url: APP_ORIGIN,
        image: new URL(APP_SOCIAL_PREVIEW_IMAGE_SRC, APP_ORIGIN).toString(),
      }
    : {}),
  author: {
    "@type": "Organization",
    name: APP_AUTHOR_NAME,
  },
  publisher: {
    "@type": "Organization",
    name: APP_AUTHOR_NAME,
  },
  datePublished: APP_PUBLISHED_DATE,
};

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homepageJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="landing-hero relative min-h-screen overflow-hidden text-white">
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-6 py-8 sm:px-8 lg:px-10">
          <nav className="flex items-center">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <BrandLogo variant="badge" />
              {APP_NAME}
            </div>
          </nav>
          <div className="max-w-3xl py-16">
            <p className="mb-4 inline-flex rounded-md bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
              For Business that sends custom quotes
            </p>
            <h1 className="text-[2.625rem] font-bold leading-[1.08] sm:text-6xl sm:leading-tight">
              Your Business Partner that Converts{" "}
              <span className="inline-block rounded-md bg-emerald-300 px-2 py-0.5 text-stone-950 ring-1 ring-emerald-100/70">
                YES
              </span>{" "}
              to{" "}
              <span className="inline-flex items-end gap-2 sm:gap-3">
                Signed
                <SignatureCue className="signature-cue mb-1 h-6 w-24 shrink-0 overflow-visible text-white/95 sm:mb-2 sm:h-8 sm:w-36" />
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-100">
              Create a quotation for your next client for FREE and get a real-time signature and
              close the sale all in one sitting.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/dashboard" size="lg">
                CREATE A QUOTE NOW
                <ArrowRight className="size-5" />
              </LinkButton>
            </div>
          </div>
          <div className="grid gap-3 pb-2 sm:grid-cols-3">
            {landingSteps.map(({ label, icon: Icon }) => (
              <div
                className="flex min-h-12 items-end gap-3 border-t border-white/25 pt-3 text-sm font-medium text-stone-100 sm:min-h-20"
                key={label}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
