import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/lib/app-config";
import { nicheLandingPages } from "@/lib/landing-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!APP_ORIGIN) {
    return [];
  }

  const lastModified = new Date();

  return [
    {
      url: APP_ORIGIN,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...nicheLandingPages.map((page) => ({
      url: `${APP_ORIGIN}/${page.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
