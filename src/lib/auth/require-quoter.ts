import { isClerkConfigured } from "./clerk";
import { personalWorkspaceRef } from "./workspaces";

export async function requireQuoter() {
  if (!isClerkConfigured()) {
    return {
      clerkUserId: "demo_quoter",
      organizationId: "demo_org",
      organizationRole: undefined,
      isPersonalWorkspace: false,
    };
  }

  const { auth } = await import("@clerk/nextjs/server");
  const session = await auth.protect();

  return {
    clerkUserId: session.userId,
    organizationId: session.orgId ?? personalWorkspaceRef(session.userId),
    organizationRole: session.orgRole,
    isPersonalWorkspace: !session.orgId,
  };
}
