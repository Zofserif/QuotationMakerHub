import { errorResponse } from "@/lib/api/responses";
import type { WorkspaceEntitlement } from "@/lib/billing/entitlements";
import type { QuoterContext } from "@/lib/quotes/persistence";

export function yearlyPartnerRequired(entitlement: WorkspaceEntitlement) {
  return errorResponse(
    "YEARLY_PARTNER_REQUIRED",
    entitlement.paidPlanExpiredAt
      ? "This team workspace's yearly partner renewal has expired. Renew the yearly plan to restore team access."
      : "Team access is available only for active Yearly Partner workspaces.",
    403,
    { entitlement },
  );
}

export function teamOwnerRequired() {
  return errorResponse(
    "TEAM_OWNER_REQUIRED",
    "Only the team workspace owner can manage team access.",
    403,
  );
}

export function canManageActiveTeam(
  quoter: QuoterContext,
  entitlement: WorkspaceEntitlement,
) {
  return (
    !quoter.isPersonalWorkspace &&
    entitlement.canAccessTeamWorkspace &&
    entitlement.canManageTeam
  );
}
