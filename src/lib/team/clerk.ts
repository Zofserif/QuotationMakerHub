import { clerkClient } from "@clerk/nextjs/server";

import { APP_ORIGIN } from "@/lib/app-config";
import { isClerkConfigured } from "@/lib/auth/clerk";
import { buildRemoteQuotePrivateMetadata } from "@/lib/billing/metadata";
import type { WorkspaceEntitlement } from "@/lib/billing/entitlements";
import type { QuoterContext } from "@/lib/quotes/persistence";

export type TeamMemberSummary = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
  isCurrentUser: boolean;
  isOwner: boolean;
};

export type TeamInvitationSummary = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
};

export type TeamWorkspaceSummary = {
  organizationId: string;
  organizationName: string;
  members: TeamMemberSummary[];
  invitations: TeamInvitationSummary[];
};

export async function getTeamWorkspaceSummary(
  quoter: QuoterContext,
  entitlement: WorkspaceEntitlement,
): Promise<TeamWorkspaceSummary | null> {
  if (
    !isClerkConfigured() ||
    !entitlement.canAccessTeamWorkspace ||
    quoter.isPersonalWorkspace
  ) {
    return null;
  }

  const clerk = await clerkClient();
  const [organization, memberships, invitations] = await Promise.all([
    clerk.organizations.getOrganization({
      organizationId: quoter.organizationId,
    }),
    clerk.organizations.getOrganizationMembershipList({
      organizationId: quoter.organizationId,
      limit: 100,
      orderBy: "+created_at",
    }),
    clerk.organizations.getOrganizationInvitationList({
      organizationId: quoter.organizationId,
      status: ["pending"],
      limit: 100,
    }),
  ]);

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    members: memberships.data.map((membership) => {
      const userData = membership.publicUserData;
      const name =
        [userData?.firstName, userData?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        userData?.identifier ||
        "Team member";
      const isCurrentUser = userData?.userId === quoter.clerkUserId;

      return {
        id: membership.id,
        userId: userData?.userId ?? "",
        email: userData?.identifier ?? "Unknown email",
        name,
        role: membership.role,
        joinedAt: formatTimestamp(membership.createdAt),
        isCurrentUser,
        isOwner: entitlement.canManageTeam && isCurrentUser,
      };
    }),
    invitations: invitations.data.map((invitation) => ({
      id: invitation.id,
      email: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status ?? "pending",
      createdAt: formatTimestamp(invitation.createdAt),
      expiresAt: formatTimestamp(invitation.expiresAt),
    })),
  };
}

export async function createTeamWorkspace(input: {
  name: string;
  quoter: QuoterContext;
  entitlement: WorkspaceEntitlement;
}) {
  const clerk = await clerkClient();
  const privateMetadata = buildRemoteQuotePrivateMetadata({
    plan: "partner_yearly",
    renewsAt: input.entitlement.renewsAt,
  });

  return clerk.organizations.createOrganization({
    name: input.name,
    createdBy: input.quoter.clerkUserId,
    privateMetadata,
    publicMetadata: {
      remoteQuoteTeam: true,
    },
  });
}

export async function createTeamInvitation(input: {
  organizationId: string;
  inviterUserId: string;
  email: string;
}) {
  const clerk = await clerkClient();

  return clerk.organizations.createOrganizationInvitation({
    organizationId: input.organizationId,
    emailAddress: input.email,
    role: "org:member",
    inviterUserId: input.inviterUserId,
    redirectUrl: APP_ORIGIN ? `${APP_ORIGIN}/dashboard` : undefined,
  });
}

export async function revokeTeamInvitation(input: {
  organizationId: string;
  invitationId: string;
  requestingUserId: string;
}) {
  const clerk = await clerkClient();

  return clerk.organizations.revokeOrganizationInvitation({
    organizationId: input.organizationId,
    invitationId: input.invitationId,
    requestingUserId: input.requestingUserId,
  });
}

export async function removeTeamMember(input: {
  organizationId: string;
  userId: string;
}) {
  const clerk = await clerkClient();

  return clerk.organizations.deleteOrganizationMembership({
    organizationId: input.organizationId,
    userId: input.userId,
  });
}

export async function deleteClerkOrganization(organizationId: string) {
  const clerk = await clerkClient();

  await clerk.organizations.deleteOrganization(organizationId);
}

function formatTimestamp(value: number) {
  return new Date(value).toISOString();
}
