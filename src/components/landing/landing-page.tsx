import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Car,
  Camera,
  CheckCircle2,
  ClockAlert,
  Form,
  Laptop,
  MessageSquareWarning,
  Send,
  Wrench,
  Zap,
} from "lucide-react";

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
import type { LandingPageNiche } from "@/lib/landing-pages";
import { nicheLandingPages } from "@/lib/landing-pages";
import { cn } from "@/lib/utils";

const landingSteps = [
  { label: "Create Your Quote", icon: Form },
  { label: "Send to Client", icon: Send },
  { label: "Signature in minutes", icon: CheckCircle2 },
];

const nicheIcons = {
  "cctv-security-quotes": Camera,
  "it-solutions-repair-quotes": Laptop,
  "hvac-electrical-repair-quotes": Zap,
  "automotive-detailing-repair-quotes": Car,
};

const painPointCards = [
  {
    title: "Delayed quotes kill momentum",
    description:
      "When you can’t send a quote right away, the client's buying window is gone.",
    icon: ClockAlert,
  },
  {
    title: "Unclear pricing creates doubt",
    description:
      "Clients want fast answers. If you can’t provide a price range, they may start looking elsewhere.",
    icon: BadgeDollarSign,
  },
  {
    title: "Slow follow-ups lead to lost deals",
    description:
      "The longer it takes to send a quotation, the easier it is for clients to forget, delay, or choose another provider.",
    icon: MessageSquareWarning,
  },
];

const homepageFaqItems = [
  {
    question: "What is Remote Quote?",
    answer:
      "Remote Quote helps service businesses create structured quotations, share them with clients, and collect client signatures while the deal is still fresh.",
  },
  {
    question: "Who is Remote Quote for?",
    answer:
      "It is built for businesses that send custom quotes, including repair teams, installers, service contractors, IT providers, automotive shops, and other service-based teams.",
  },
  {
    question: "Can clients sign quotes online?",
    answer:
      "Yes. Remote Quote supports client signing links and browser-based signatures so clients can review and approve a quotation without printing it first.",
  },
  {
    question: "Can I use it for different types of services?",
    answer:
      "Yes. You can create itemized quotes for different scopes of work, service packages, materials, labor, notes, terms, and client requirements.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. Remote Quote runs in the browser, so you can create and manage quotations from your dashboard without installing desktop software.",
  },
  {
    question: "Can I create a quote for free?",
    answer:
      "Yes. You can start by creating a quotation for free, then use partner packages when your workspace needs higher limits or team features.",
  },
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

function LandingHero() {
  return (
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
            <LinkButton
              className="bg-emerald-300 text-stone-950 ring-1 ring-emerald-100/70 hover:bg-emerald-200"
              href="/dashboard"
              size="lg"
            >
              <b>CREATE A QUOTE NOW</b>
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
  );
}

function PainPointSection() {
  return (
    <section className="bg-stone-50 px-6 py-16 text-stone-950 sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold leading-tight text-stone-900 sm:text-5xl">
            Your client is ready to buy. Your{" "}
            <span className="inline-block text-emerald-700 underline decoration-emerald-300 decoration-4 underline-offset-4">
              quote isn’t.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
            That delay can cost you the sale and these are the common symptoms
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3 lg:mt-16">
          {painPointCards.map(({ title, description, icon: Icon }) => (
            <article
              className="rounded-md border border-stone-200 bg-white p-6 text-stone-900 shadow-sm"
              key={title}
            >
              <div className="mx-auto flex size-14 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-emerald-700 shadow-sm">
                <Icon aria-hidden="true" className="size-7" />
              </div>
              <h3 className="mt-7 text-lg font-semibold leading-7">{title}</h3>
              <p className="mt-4 text-sm leading-6 text-stone-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductStepsSection() {
  return (
    <section className="bg-white px-6 py-16 text-stone-950 sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            See the product
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-stone-900 sm:text-5xl">
            From quote request to signed approval in one simple flow.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
            Remote Quote helps you prepare the quotation, send it to your client, and collect a
            signature while the deal is still fresh.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-md border border-emerald-200 bg-stone-950 shadow-sm ring-2 ring-emerald-100/80 lg:mt-16">
          <video
            aria-label="Remote Quote product walkthrough video"
            autoPlay
            className="aspect-video w-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src="/product-demo.webm" type="video/webm" />
            Your browser does not support the product walkthrough video.
          </video>
        </div>
        <div className="mx-auto mt-6 grid max-w-5xl gap-3 md:grid-cols-3">
          {landingSteps.map(({ label, icon: Icon }, index) => (
            <div
              className="flex min-h-24 items-center gap-4 rounded-md border border-stone-200 bg-stone-50 p-5 shadow-sm"
              key={label}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-normal text-stone-500">
                  Step {index + 1}
                </span>
                <span className="mt-1 block text-base font-semibold leading-6 text-stone-900">
                  {label}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingJsonLd({ niche }: { niche?: LandingPageNiche }) {
  const url = APP_ORIGIN && niche ? `${APP_ORIGIN}/${niche.slug}` : APP_ORIGIN;
  const pageJsonLd = {
    "@type": niche ? "WebPage" : "WebSite",
    name: niche?.metadataTitle ?? APP_NAME,
    description: niche?.metadataDescription ?? APP_DESCRIPTION,
    ...(url
      ? {
          url,
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
  const jsonLd = niche
    ? {
        "@context": "https://schema.org",
        ...pageJsonLd,
      }
    : {
        "@context": "https://schema.org",
        "@graph": [
          pageJsonLd,
          {
            "@type": "FAQPage",
            mainEntity: homepageFaqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          },
        ],
      };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function HomepageFaqSection() {
  return (
    <section className="bg-white px-6 py-16 text-stone-950 sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Questions before you quote
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-stone-900 sm:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
            Practical answers for teams that need to create, share, and collect approval on
            quotations faster.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2 lg:mt-16">
          {homepageFaqItems.map((item) => (
            <article
              className="rounded-md border border-stone-200 bg-stone-50 p-6 shadow-sm"
              key={item.question}
            >
              <h3 className="text-lg font-semibold leading-7 text-stone-950">
                {item.question}
              </h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-stone-950 px-6 py-16 text-white sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">
            Ready for the next client
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            Create the quote while the client is ready to say yes.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
            Build a clear quotation, share it for review, and collect the signature before the
            conversation goes cold.
          </p>
        </div>
        <LinkButton
          className="w-fit bg-emerald-300 text-stone-950 ring-1 ring-emerald-100/70 hover:bg-emerald-200"
          href="/dashboard"
          size="lg"
        >
          <b>Create a quote now</b>
          <ArrowRight className="size-5" />
        </LinkButton>
      </div>
    </section>
  );
}

function GeneralNicheSelector() {
  return (
    <section className="bg-stone-50 px-6 py-16 text-stone-950 sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Built for service businesses that quote on the go
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            See how Remote Quote fits your business
          </h2>
          <p className="mt-4 text-lg leading-8 text-stone-700">
            From urgent repairs to technical projects, Remote Quote helps you send quotes before your client moves on.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {nicheLandingPages.map((niche) => {
            const Icon = nicheIcons[niche.slug as keyof typeof nicheIcons] ?? Wrench;

            return (
              <Link
                className="group flex min-h-64 flex-col justify-between rounded-md border border-stone-200 bg-white p-5 text-stone-950 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                href={`/${niche.slug}`}
                key={niche.slug}
              >
                <span>
                  <span className="flex size-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                    <Icon className="size-5" />
                  </span>
                  <span className="mt-5 block text-lg font-semibold leading-7">{niche.label}</span>
                  <span className="mt-3 block text-sm leading-6 text-stone-600">
                    {niche.introTitle}
                  </span>
                </span>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  See niche message
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MessageList({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li className="flex gap-3 text-sm leading-6 text-stone-700" key={item}>
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NicheMessage({ niche }: { niche: LandingPageNiche }) {
  return (
    <section className="bg-stone-50 px-6 py-16 text-stone-950 sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
              {niche.eyebrow}
            </p>
            <h2 className="mt-3 max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
              {niche.introTitle}
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-700">{niche.intro}</p>
          </div>
          <div className="rounded-md bg-stone-950 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold text-emerald-200">Example quote scope</p>
            <ul className="mt-5 space-y-3">
              {niche.exampleQuoteItems.map((item) => (
                <li className="flex gap-3 text-sm leading-6 text-stone-100" key={item}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <MessageList items={niche.painPoints} title="Why generic quote tools feel slow" />
          <MessageList items={niche.workflowBenefits} title="How Remote Quote fits your workflow" />
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <LinkButton
            className={cn(
              "bg-emerald-300 text-stone-950 ring-1 ring-emerald-100/70 hover:bg-emerald-200",
              "h-auto min-h-12 px-5 py-3 text-left text-base",
            )}
            href="/dashboard"
            size="lg"
          >
            <b>{niche.ctaText}</b>
            <ArrowRight className="size-5 shrink-0" />
          </LinkButton>
          <p className="text-sm leading-6 text-stone-600">
            Same quote builder, tailored message for {niche.label.toLowerCase()}.
          </p>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const footerColumns = [
    {
      title: "Product",
      links: [
        { label: "Create a Quote", href: "/dashboard" },
        { label: "Quote Dashboard", href: "/dashboard" },
      ],
    },
    {
      title: "Industries",
      links: nicheLandingPages.map((niche) => ({
        label: niche.label,
        href: `/${niche.slug}`,
      })),
    },
    {
      title: "Company",
      links: [{ label: "Contact", href: "/contact" }],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
  ];

  return (
    <footer className="bg-stone-950 px-6 py-12 text-stone-300 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link className="inline-flex items-center gap-2 text-white" href="/">
            <BrandLogo variant="badge" />
            <span className="text-lg font-semibold">{APP_NAME}</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-stone-400">
            Create clear quotations, share client-ready approval links, and collect signatures
            while the deal is still fresh.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold uppercase tracking-normal text-white">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      className="text-sm leading-6 text-stone-400 transition-colors hover:text-emerald-200"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <p>Built for service businesses that quote, approve, and sign faster.</p>
      </div>
    </footer>
  );
}

export function LandingPage({
  niche,
  showHero = true,
}: {
  niche?: LandingPageNiche;
  showHero?: boolean;
}) {
  return (
    <main className="min-h-screen bg-stone-50">
      <LandingJsonLd niche={niche} />
      {showHero ? <LandingHero /> : null}
      {showHero ? <PainPointSection /> : null}
      {showHero ? <ProductStepsSection /> : null}
      {niche ? <NicheMessage niche={niche} /> : <GeneralNicheSelector />}
      {showHero ? <HomepageFaqSection /> : null}
      {showHero ? <FinalCtaSection /> : null}
      <LandingFooter />
    </main>
  );
}
