import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_ORIGIN,
  APP_SOCIAL_PREVIEW_IMAGE_ALT,
  APP_SOCIAL_PREVIEW_IMAGE_HEIGHT,
  APP_SOCIAL_PREVIEW_IMAGE_SRC,
  APP_SOCIAL_PREVIEW_IMAGE_TYPE,
  APP_SOCIAL_PREVIEW_IMAGE_WIDTH,
} from "@/lib/app-config";

const metadataTitle = "Remote Quote - Create Quote and Send to Client";

const socialPreviewImage = {
  url: APP_SOCIAL_PREVIEW_IMAGE_SRC,
  alt: APP_SOCIAL_PREVIEW_IMAGE_ALT,
  width: APP_SOCIAL_PREVIEW_IMAGE_WIDTH,
  height: APP_SOCIAL_PREVIEW_IMAGE_HEIGHT,
  type: APP_SOCIAL_PREVIEW_IMAGE_TYPE,
};

export const metadata: Metadata = {
  title: metadataTitle,
  description: APP_DESCRIPTION,
  ...(APP_ORIGIN
    ? {
        alternates: {
          canonical: "/",
        },
        openGraph: {
          title: metadataTitle,
          description: APP_DESCRIPTION,
          siteName: APP_NAME,
          url: APP_ORIGIN,
          type: "website",
          locale: "en_US",
          images: [socialPreviewImage],
        },
        twitter: {
          card: "summary_large_image",
          title: metadataTitle,
          description: APP_DESCRIPTION,
          images: [socialPreviewImage],
        },
      }
    : {}),
};

export default function Home() {
  return <LandingPage />;
}
