import { auth } from "@clerk/nextjs/server";

import { isClerkConfigured } from "./clerk";

export async function requireQuoter() {
  if (!isClerkConfigured()) {
    return {
      clerkUserId: "demo_quoter",
      organizationId: "demo_org",
    };
  }

  const session = await auth.protect();

  return {
    clerkUserId: session.userId,
    organizationId: session.orgId ?? "personal",
  };
}
