"use client";

import { useState, type ChangeEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type DashboardFilterOption = {
  key: string;
  label: string;
  href: string;
  count: number;
  selected: boolean;
};

export function DashboardFilters({
  statusOptions,
  visibilityOptions,
}: {
  statusOptions: DashboardFilterOption[];
  visibilityOptions: DashboardFilterOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const [pendingVisibility, setPendingVisibility] = useState<{
    key: string;
    searchParamString: string;
  } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{
    searchParamString: string;
  } | null>(null);
  const selectedStatus =
    statusOptions.find((option) => option.selected)?.key ?? "all";
  const isStatusPending =
    pendingStatus?.searchParamString === searchParamString;

  function handleVisibilityClick(
    event: MouseEvent<HTMLAnchorElement>,
    option: DashboardFilterOption,
  ) {
    if (option.selected || isModifiedClick(event)) {
      return;
    }

    setPendingVisibility({ key: option.key, searchParamString });
  }

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    const option = statusOptions.find(
      (candidate) => candidate.key === event.target.value,
    );

    if (!option || option.selected) {
      return;
    }

    setPendingStatus({ searchParamString });
    router.push(option.href);
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
      <nav
        aria-label="Quotation visibility"
        className="inline-flex w-fit rounded-md border border-stone-200 bg-stone-50 p-1"
      >
        {visibilityOptions.map((option) => {
          const isPending =
            pendingVisibility?.key === option.key &&
            pendingVisibility.searchParamString === searchParamString;

          return (
            <Link
              aria-busy={isPending || undefined}
              aria-current={option.selected ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded px-3 text-sm font-semibold transition-colors",
                option.selected
                  ? "bg-white text-stone-950 shadow-sm ring-1 ring-stone-200"
                  : "text-stone-600 hover:text-stone-950",
              )}
              href={option.href}
              key={option.key}
              onClick={(event) => handleVisibilityClick(event, option)}
            >
              {isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : null}
              <span>{option.label}</span>
              <span className="text-xs text-stone-500">{option.count}</span>
            </Link>
          );
        })}
      </nav>

      <label className="flex min-w-0 items-center gap-2 text-sm font-medium text-stone-600">
        <span className="shrink-0">Status</span>
        <select
          aria-label="Quotation status"
          className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-100 md:w-64"
          disabled={isStatusPending}
          value={selectedStatus}
          onChange={handleStatusChange}
        >
          {statusOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>
    </section>
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
