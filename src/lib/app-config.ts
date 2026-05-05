export const APP_NAME = "Remote Quote - Create Quote and Send to Client";

export const APP_LOGO_SRC = "/remote-quote-logo.svg";

export const APP_DESCRIPTION =
  "Create a quotation for your next client for FREE and get a real-time signature and close the sale all in one sitting";

export const APP_ORIGIN = normalizeAppOrigin(process.env.NEXT_PUBLIC_APP_URL);

export function normalizeAppOrigin(value?: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    url.pathname = "";
    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}
