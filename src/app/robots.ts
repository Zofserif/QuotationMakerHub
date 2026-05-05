import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/lib/app-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    ...(APP_ORIGIN ? { sitemap: `${APP_ORIGIN}/sitemap.xml` } : {}),
  };
}
