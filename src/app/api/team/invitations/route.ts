import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

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
  }).catch(toTeamInvitationErrorResponse);

  if (invitation instanceof Response) {
    return invitation;
  }

  return Response.json({
    invitation: {
      id: invitation.id,
      email: invitation.emailAddress,
      status: invitation.status ?? "pending",
      url: invitation.url,
    },
  });
}

function toTeamInvitationErrorResponse(error: unknown) {
  if (!isClerkAPIResponseError(error)) {
    return errorResponse(
      "TEAM_INVITE_FAILED",
      "Invitation could not be sent.",
      500,
    );
  }

  const clerkError = error.errors[0];
  const clerkCode = clerkError?.code;
  const clerkMessage = safeClerkMessage(clerkError?.message);

  if (clerkCode === "invitations_not_supported") {
    return errorResponse(
      "CLERK_EMAIL_INVITES_DISABLED",
      "Team invitations require Email to be enabled in Clerk.",
      503,
    );
  }

  if (error.status === 409) {
    return errorResponse(
      "TEAM_INVITE_CONFLICT",
      clerkMessage ??
        "This teammate is already invited or already belongs to the team.",
      409,
    );
  }

  if (error.status === 429) {
    return errorResponse(
      "TEAM_INVITE_RATE_LIMITED",
      clerkMessage ?? "Too many team invitations were sent. Try again later.",
      429,
    );
  }

  if (error.status >= 400 && error.status < 500) {
    return errorResponse(
      "CLERK_TEAM_INVITE_REJECTED",
      clerkMessage ?? "Invitation could not be sent.",
      400,
    );
  }

  return errorResponse(
    "TEAM_INVITE_FAILED",
    "Invitation could not be sent.",
    500,
  );
}

function safeClerkMessage(message?: string) {
  const trimmedMessage = message?.trim();

  return trimmedMessage ? trimmedMessage : undefined;
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
