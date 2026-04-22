import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { dashboardRoutes, isClerkConfigured } from "@/lib/auth/clerk";

const isProtectedRoute = createRouteMatcher(dashboardRoutes);

export default clerkMiddleware(async (auth, request) => {
  if (!isClerkConfigured()) {
    return;
  }

  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
