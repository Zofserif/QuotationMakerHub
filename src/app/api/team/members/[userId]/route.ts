import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  canManageActiveTeam,
  teamOwnerRequired,
  yearlyPartnerRequired,
} from "@/lib/team/access";
import { removeTeamMember } from "@/lib/team/clerk";
import { deleteClerkOrganizationMembership } from "@/lib/team/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canAccessTeamWorkspace) {
    return yearlyPartnerRequired(entitlement);
  }

  if (!canManageActiveTeam(quoter, entitlement)) {
    return teamOwnerRequired();
  }

  const { userId } = await params;

  if (userId === quoter.clerkUserId) {
    return errorResponse(
      "CANNOT_REMOVE_OWNER",
      "The team owner cannot remove themselves from the team workspace.",
      409,
    );
  }

  await removeTeamMember({
    organizationId: quoter.organizationId,
    userId,
  });
  await deleteClerkOrganizationMembership({
    workspaceRef: quoter.organizationId,
    clerkUserId: userId,
  });

  return Response.json({ removed: true });
}
