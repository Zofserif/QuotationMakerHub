import { CheckCircle2, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type PricingSection = {
  title: string;
  items: string[];
};

type PricingPlanSectionsProps = {
  className?: string;
  plan: {
    name: string;
    features: string[];
    details?: string[];
  };
};

type PaidPlanSupportBlockProps = {
  className?: string;
  support: {
    title: string;
    description: string;
    items: string[];
  };
};

export function PaidPlanSupportBlock({
  className,
  support,
}: PaidPlanSupportBlockProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-stone-900",
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr] lg:items-start">
        <div>
          <h3 className="text-sm font-semibold text-stone-950">
            {support.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-stone-700">
            {support.description}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-emerald-800">
            We help you
          </p>
          <ul className="mt-2 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
            {support.items.map((item) => (
              <li className="flex min-w-0 gap-2" key={item}>
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-emerald-700"
                />
                <span className="min-w-0 leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function PricingPlanSections({
  className,
  plan,
}: PricingPlanSectionsProps) {
  const sections = [
    { title: "Includes", items: plan.features },
  ].filter((section): section is PricingSection => section !== null);

  return (
    <div className={cn("mt-4 space-y-4 text-sm", className)}>
      {sections.map((section) => (
        <PricingPlanSection key={section.title} section={section} />
      ))}
      {plan.details?.length ? (
        <PricingPlanDetailsAccordion
          items={plan.details}
          title={`Full ${plan.name} details`}
        />
      ) : null}
    </div>
  );
}

function PricingPlanSection({ section }: { section: PricingSection }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-normal text-stone-500">
        {section.title}
      </h4>
      <ul className="mt-2 space-y-2 text-stone-700">
        {section.items.map((item) => (
          <li className="flex min-w-0 gap-2" key={`${section.title}-${item}`}>
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-emerald-700"
            />
            <span className="min-w-0 leading-6">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PricingPlanDetailsAccordion({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <details className="group rounded-md border border-stone-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-stone-800 outline-none transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-stone-500 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="space-y-2 border-t border-stone-200 px-3 py-3 text-stone-700">
        {items.map((item) => (
          <li className="flex min-w-0 gap-2" key={`${title}-${item}`}>
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-emerald-700"
            />
            <span className="min-w-0 leading-6">{item}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
