import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/lib/app-config";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!APP_ORIGIN) {
    return [];
  }

  return [
    {
      url: APP_ORIGIN,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
