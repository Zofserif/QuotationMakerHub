export const APP_NAME = "Remote Quote";

export const APP_AUTHOR_NAME = APP_NAME;

export const APP_PUBLISHED_DATE = "2026-05-05";

export const APP_LOGO_SRC = "/remote-quote-logo.svg";

export const APP_SOCIAL_PREVIEW_IMAGE_SRC = "/link-preview.jpg";

export const APP_SOCIAL_PREVIEW_IMAGE_ALT =
  "Remote Quote preview showing a business agreement workflow";

export const APP_SOCIAL_PREVIEW_IMAGE_WIDTH = 1200;

export const APP_SOCIAL_PREVIEW_IMAGE_HEIGHT = 630;

export const APP_SOCIAL_PREVIEW_IMAGE_TYPE = "image/jpeg";

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
