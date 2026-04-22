"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { AnalyticsProvider } from "@/lib/analytics/posthog-client";

export function Providers({ children }: { children: ReactNode }) {
  const content = <AnalyticsProvider>{children}</AnalyticsProvider>;

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
