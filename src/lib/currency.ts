export const APP_CURRENCY = "PHP";

export const supportedCurrencies = [
  { code: "PHP", label: "PHP (\u20b1)", locale: "en-PH" },
  { code: "USD", label: "USD ($)", locale: "en-US" },
  { code: "EUR", label: "EUR (\u20ac)", locale: "en-IE" },
  { code: "GBP", label: "GBP (\u00a3)", locale: "en-GB" },
  { code: "AUD", label: "AUD (A$)", locale: "en-AU" },
  { code: "CAD", label: "CAD (CA$)", locale: "en-CA" },
  { code: "SGD", label: "SGD (S$)", locale: "en-SG" },
  { code: "JPY", label: "JPY (\u00a5)", locale: "ja-JP" },
  { code: "CNY", label: "CNY (\u00a5)", locale: "zh-CN" },
  { code: "HKD", label: "HKD (HK$)", locale: "en-HK" },
  { code: "AED", label: "AED (\u062f.\u0625)", locale: "en-AE" },
] as const;

export type SupportedCurrencyCode =
  (typeof supportedCurrencies)[number]["code"];

export type MoneyDisplay = "symbol" | "text";

export const supportedCurrencyCodes = supportedCurrencies.map(
  ({ code }) => code,
) as [SupportedCurrencyCode, ...SupportedCurrencyCode[]];

export const APP_CURRENCY_LOCALE = getCurrencyMeta(APP_CURRENCY).locale;
export const APP_CURRENCY_DISPLAY_NAME = getCurrencyDisplayName(APP_CURRENCY);

export function isSupportedCurrency(
  currency?: string | null,
): currency is SupportedCurrencyCode {
  return supportedCurrencyCodes.some((code) => code === currency);
}

export function normalizeCurrency(currency?: string | null) {
  const normalized = currency?.trim().toUpperCase();

  return isSupportedCurrency(normalized) ? normalized : APP_CURRENCY;
}

export function getCurrencyMeta(currency?: string | null) {
  const normalized = normalizeCurrency(currency);

  return (
    supportedCurrencies.find(({ code }) => code === normalized) ??
    supportedCurrencies[0]
  );
}

export function getCurrencyDisplayName(currency?: string | null) {
  return getCurrencyMeta(currency).label;
}

export function getCurrencyFractionDigits(currency?: string | null) {
  const meta = getCurrencyMeta(currency);

  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function getCurrencyMinorUnitMultiplier(currency?: string | null) {
  return 10 ** getCurrencyFractionDigits(currency);
}

export function getCurrencyInputStep(currency?: string | null) {
  const fractionDigits = getCurrencyFractionDigits(currency);

  return fractionDigits === 0 ? "1" : `0.${"0".repeat(fractionDigits - 1)}1`;
}
