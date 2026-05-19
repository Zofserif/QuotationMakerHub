import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import {
  APP_NAME,
  APP_ORIGIN,
  APP_SOCIAL_PREVIEW_IMAGE_ALT,
  APP_SOCIAL_PREVIEW_IMAGE_HEIGHT,
  APP_SOCIAL_PREVIEW_IMAGE_SRC,
  APP_SOCIAL_PREVIEW_IMAGE_TYPE,
  APP_SOCIAL_PREVIEW_IMAGE_WIDTH,
} from "@/lib/app-config";
import {
  getNicheLandingPage,
  nicheLandingPageSlugs,
} from "@/lib/landing-pages";

type NicheLandingPageProps = {
  params: Promise<{
    landingSlug: string;
  }>;
};

const socialPreviewImage = {
  url: APP_SOCIAL_PREVIEW_IMAGE_SRC,
  alt: APP_SOCIAL_PREVIEW_IMAGE_ALT,
  width: APP_SOCIAL_PREVIEW_IMAGE_WIDTH,
  height: APP_SOCIAL_PREVIEW_IMAGE_HEIGHT,
  type: APP_SOCIAL_PREVIEW_IMAGE_TYPE,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return nicheLandingPageSlugs.map((landingSlug) => ({ landingSlug }));
}

export async function generateMetadata({
  params,
}: NicheLandingPageProps): Promise<Metadata> {
  const { landingSlug } = await params;
  const niche = getNicheLandingPage(landingSlug);

  if (!niche) {
    return {};
  }

  const url = APP_ORIGIN ? `${APP_ORIGIN}/${niche.slug}` : undefined;

  return {
    title: niche.metadataTitle,
    description: niche.metadataDescription,
    alternates: {
      canonical: `/${niche.slug}`,
    },
    ...(url
      ? {
          openGraph: {
            title: niche.metadataTitle,
            description: niche.metadataDescription,
            siteName: APP_NAME,
            url,
            type: "website",
            locale: "en_US",
            images: [socialPreviewImage],
          },
          twitter: {
            card: "summary_large_image",
            title: niche.metadataTitle,
            description: niche.metadataDescription,
            images: [socialPreviewImage],
          },
        }
      : {}),
  };
}

export default async function NicheLandingPage({ params }: NicheLandingPageProps) {
  const { landingSlug } = await params;
  const niche = getNicheLandingPage(landingSlug);

  if (!niche) {
    notFound();
  }

  return <LandingPage niche={niche} showHero={false} />;
}
