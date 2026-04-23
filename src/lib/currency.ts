export const APP_CURRENCY = "PHP";
export const APP_CURRENCY_LOCALE = "en-PH";
export const APP_CURRENCY_DISPLAY_NAME = `${APP_CURRENCY} (\u20b1)`;

export function normalizeCurrency(currency?: string | null) {
  void currency;
  return APP_CURRENCY;
}
