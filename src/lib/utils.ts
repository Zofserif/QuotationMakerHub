import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { APP_CURRENCY, APP_CURRENCY_LOCALE } from "@/lib/currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(minor: number, currency = APP_CURRENCY) {
  void currency;
  return new Intl.NumberFormat(APP_CURRENCY_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY,
  }).format(minor / 100);
}

export function formatDate(value?: string | Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatQuoteIssuedDate(value?: string | Date | null) {
  if (!value) {
    return "Pending";
  }

  return format(typeof value === "string" ? new Date(value) : value, "MMM-dd-yyyy");
}

export function minorToMajorString(minor: number) {
  return (minor / 100).toFixed(2);
}

export function majorToMinor(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  return Math.max(0, Math.round(Number(normalized) * 100));
}
