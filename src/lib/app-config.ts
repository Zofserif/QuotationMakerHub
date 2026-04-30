export const APP_NAME = "Remote Quote";

export const APP_DESCRIPTION =
  "Create, send, sign, and export structured quotations.";

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
