import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  canManageActiveTeam,
  teamOwnerRequired,
  yearlyPartnerRequired,
} from "@/lib/team/access";
import { revokeTeamInvitation } from "@/lib/team/clerk";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canAccessTeamWorkspace) {
    return yearlyPartnerRequired(entitlement);
  }

  if (!canManageActiveTeam(quoter, entitlement)) {
    return teamOwnerRequired();
  }

  const { invitationId } = await params;
  await revokeTeamInvitation({
    organizationId: quoter.organizationId,
    invitationId,
    requestingUserId: quoter.clerkUserId,
  });

  return Response.json({ revoked: true });
}
