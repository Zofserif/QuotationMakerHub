import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  canManageActiveTeam,
  teamOwnerRequired,
  yearlyPartnerRequired,
} from "@/lib/team/access";
import { createTeamInvitation } from "@/lib/team/clerk";

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
  const email = parseEmail(body);

  if (!email) {
    return errorResponse(
      "INVALID_TEAM_INVITE",
      "Enter a valid teammate email address.",
      422,
    );
  }

  const invitation = await createTeamInvitation({
    organizationId: quoter.organizationId,
    inviterUserId: quoter.clerkUserId,
    email,
  });

  return Response.json({
    invitation: {
      id: invitation.id,
      email: invitation.emailAddress,
      status: invitation.status ?? "pending",
      url: invitation.url,
    },
  });
}

function parseEmail(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const email = (value as { email?: unknown }).email;

  if (typeof email !== "string") {
    return undefined;
  }

  const trimmedEmail = email.trim().toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ? trimmedEmail
    : undefined;
}
