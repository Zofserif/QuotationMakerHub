import { isClerkConfigured } from "./clerk";

export async function requireQuoter() {
  if (!isClerkConfigured()) {
    return {
      clerkUserId: "demo_quoter",
      organizationId: "demo_org",
    };
  }

  const { auth } = await import("@clerk/nextjs/server");
  const session = await auth.protect();

  return {
    clerkUserId: session.userId,
    organizationId: session.orgId ?? `personal:${session.userId}`,
  };
}
