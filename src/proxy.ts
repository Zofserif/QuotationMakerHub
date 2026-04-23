import type { NextFetchEvent, NextRequest } from "next/server";

import { dashboardRoutes, isClerkConfigured } from "@/lib/auth/clerk";

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (!isClerkConfigured()) {
    return;
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return;
  }

  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  const middleware = clerkMiddleware(async (auth) => {
    await auth.protect();
  });

  return middleware(request, event);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};

function isProtectedPath(pathname: string) {
  return dashboardRoutes.some((route) => {
    const prefix = route.replace("(.*)", "");

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
