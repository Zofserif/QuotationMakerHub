import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  canManageActiveTeam,
  teamOwnerRequired,
  yearlyPartnerRequired,
} from "@/lib/team/access";
import {
  ensureTeamJoinLink,
  revokeActiveTeamJoinLink,
  TeamJoinLinkError,
} from "@/lib/team/join-links";

export async function POST(request: Request) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canAccessTeamWorkspace) {
    return yearlyPartnerRequired(entitlement);
  }

  if (!canManageActiveTeam(quoter, entitlement)) {
    return teamOwnerRequired();
  }

  const body = await readJson(request);
  const joinLink = await ensureTeamJoinLink({
    workspaceRef: quoter.organizationId,
    createdByClerkUserId: quoter.clerkUserId,
    rotate: parseRotate(body),
  }).catch(toTeamJoinLinkResponse);

  if (joinLink instanceof Response) {
    return joinLink;
  }

  return Response.json({ joinLink });
}

export async function DELETE() {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canAccessTeamWorkspace) {
    return yearlyPartnerRequired(entitlement);
  }

  if (!canManageActiveTeam(quoter, entitlement)) {
    return teamOwnerRequired();
  }

  const result = await revokeActiveTeamJoinLink({
    workspaceRef: quoter.organizationId,
  }).catch(toTeamJoinLinkResponse);

  if (result instanceof Response) {
    return result;
  }

  return Response.json({ joinLink: null });
}

function parseRotate(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { rotate?: unknown }).rotate === true,
  );
}

function toTeamJoinLinkResponse(error: unknown) {
  if (error instanceof TeamJoinLinkError) {
    return errorResponse(error.code, error.message, error.status);
  }

  return errorResponse(
    "TEAM_JOIN_LINK_FAILED",
    "Team join link could not be updated.",
    500,
  );
}
