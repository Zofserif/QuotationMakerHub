import { majorToMinor, minorToMajorString } from "@/lib/utils";

const decimalPattern = /^(?:\d+|\d+\.\d*|\.\d+)$/;

export function parseNonNegativeDecimalInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed || !decimalPattern.test(trimmed)) {
    return null;
  }

  const numericValue = Number(trimmed);

  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : null;
}

export function parsePositiveIntegerInput(value: string) {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  return Math.max(1, Number.parseInt(trimmed, 10));
}

export function normalizeMoneyInput(value: string, currency: string) {
  const numericValue = parseNonNegativeDecimalInput(value);

  return minorToMajorString(
    majorToMinor(numericValue === null ? "0" : String(numericValue), currency),
    currency,
  );
}

export function formatPercentInput(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

export function normalizePercentInput(value: string, max = 100) {
  const numericValue = parseNonNegativeDecimalInput(value) ?? 0;
  const clampedValue = Math.min(max, Math.max(0, numericValue));

  return formatPercentInput(clampedValue);
}
