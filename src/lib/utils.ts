import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import {
  APP_CURRENCY,
  getCurrencyFractionDigits,
  getCurrencyMeta,
  getCurrencyMinorUnitMultiplier,
  type MoneyDisplay,
} from "@/lib/currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(
  minor: number,
  currency = APP_CURRENCY,
  display: MoneyDisplay = "symbol",
) {
  const meta = getCurrencyMeta(currency);

  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    currencyDisplay: display === "text" ? "code" : "symbol",
  }).format(minor / getCurrencyMinorUnitMultiplier(meta.code));
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

export function minorToMajorString(minor: number, currency = APP_CURRENCY) {
  const fractionDigits = getCurrencyFractionDigits(currency);

  return (minor / getCurrencyMinorUnitMultiplier(currency)).toFixed(
    fractionDigits,
  );
}

export function majorToMinor(value: string, currency = APP_CURRENCY) {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(numericValue * getCurrencyMinorUnitMultiplier(currency)),
  );
}
