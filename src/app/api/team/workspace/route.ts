import { errorResponse, readJson } from "@/lib/api/responses";
import { isClerkConfigured } from "@/lib/auth/clerk";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  createTeamWorkspace,
  deleteClerkOrganization,
  getCreatedTeamWorkspace,
  updateTeamWorkspaceName,
} from "@/lib/team/clerk";
import {
  migratePersonalWorkspaceToTeam,
  syncClerkOrganization,
} from "@/lib/team/supabase";
import { yearlyPartnerRequired } from "@/lib/team/access";

export async function POST(request: Request) {
  if (!isClerkConfigured()) {
    return errorResponse(
      "CLERK_REQUIRED",
      "Team workspaces require Clerk Organizations to be configured.",
      503,
    );
  }

  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canCreateTeamWorkspace) {
    return yearlyPartnerRequired(entitlement);
  }

  const existingTeam = await getCreatedTeamWorkspace(quoter.clerkUserId);

  if (existingTeam) {
    return errorResponse(
      "TEAM_WORKSPACE_LIMIT",
      "Yearly Partner accounts can create only one team workspace. Update your existing team workspace name instead.",
      409,
      { organizationId: existingTeam.organizationId },
    );
  }

  const body = await readJson(request);
  const name = parseTeamName(body);

  if (!name) {
    return errorResponse(
      "INVALID_TEAM_WORKSPACE",
      "Enter a team workspace name.",
      422,
    );
  }

  const organization = await createTeamWorkspace({
    name,
    quoter,
    entitlement,
  });

  try {
    const migration = await migratePersonalWorkspaceToTeam({
      ownerUserId: quoter.clerkUserId,
      teamWorkspaceRef: organization.id,
      teamName: organization.name,
    });

    if (!migration.ok) {
      await deleteClerkOrganization(organization.id);

      return errorResponse(
        "TEAM_WORKSPACE_EXISTS",
        "A local team workspace already exists for this Clerk organization.",
        409,
      );
    }
  } catch (error) {
    await deleteClerkOrganization(organization.id).catch(() => undefined);
    throw error;
  }

  return Response.json({
    organizationId: organization.id,
    organizationName: organization.name,
  });
}

export async function PATCH(request: Request) {
  if (!isClerkConfigured()) {
    return errorResponse(
      "CLERK_REQUIRED",
      "Team workspaces require Clerk Organizations to be configured.",
      503,
    );
  }

  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.isYearlyPartnerWorkspace) {
    return yearlyPartnerRequired(entitlement);
  }

  const existingTeam = await getCreatedTeamWorkspace(quoter.clerkUserId);

  if (!existingTeam) {
    return errorResponse(
      "TEAM_WORKSPACE_NOT_FOUND",
      "Create a team workspace before updating its name.",
      404,
    );
  }

  if (
    !quoter.isPersonalWorkspace &&
    quoter.organizationId !== existingTeam.organizationId
  ) {
    return errorResponse(
      "TEAM_WORKSPACE_MISMATCH",
      "Select your created team workspace before updating its name.",
      403,
    );
  }

  const body = await readJson(request);
  const name = parseTeamName(body);

  if (!name) {
    return errorResponse(
      "INVALID_TEAM_WORKSPACE",
      "Enter a team workspace name.",
      422,
    );
  }

  const organization = await updateTeamWorkspaceName({
    organizationId: existingTeam.organizationId,
    name,
  });

  await syncClerkOrganization({
    workspaceRef: organization.organizationId,
    name: organization.organizationName,
  });

  return Response.json(organization);
}

function parseTeamName(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const name = (value as { name?: unknown }).name;

  if (typeof name !== "string") {
    return undefined;
  }

  const trimmedName = name.trim();

  return trimmedName.length >= 2 ? trimmedName.slice(0, 120) : undefined;
}
