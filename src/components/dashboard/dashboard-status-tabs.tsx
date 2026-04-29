"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type DashboardStatusTab = {
  key: string;
  label: string;
  href: string;
  count: number;
  selected: boolean;
};

export function DashboardStatusTabs({
  ariaLabel = "Quotation status",
  tabs,
}: {
  ariaLabel?: string;
  tabs: DashboardStatusTab[];
}) {
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const [pendingTab, setPendingTab] = useState<{
    key: string;
    searchParamString: string;
  } | null>(null);

  function handleClick(
    event: MouseEvent<HTMLAnchorElement>,
    tab: DashboardStatusTab,
  ) {
    if (tab.selected || isModifiedClick(event)) {
      return;
    }

    setPendingTab({ key: tab.key, searchParamString });
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 rounded-lg border border-stone-200 bg-white p-2"
    >
      {tabs.map((tab) => {
        const isPending =
          pendingTab?.key === tab.key &&
          pendingTab.searchParamString === searchParamString;

        return (
          <Link
            aria-current={tab.selected ? "page" : undefined}
            aria-busy={isPending || undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              tab.selected
                ? "bg-stone-950 text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-950",
            )}
            href={tab.href}
            key={tab.key}
            onClick={(event) => handleClick(event, tab)}
          >
            <span
              aria-hidden="true"
              className="grid size-4 shrink-0 place-items-center"
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
            </span>
            <span>{tab.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                tab.selected
                  ? "bg-white/15 text-white"
                  : "bg-stone-100 text-stone-600",
              )}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}
