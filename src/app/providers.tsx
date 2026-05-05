"use client";

import type { ReactNode } from "react";

import { AnalyticsProvider } from "@/lib/analytics/posthog-client";

export function Providers({ children }: { children: ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}
