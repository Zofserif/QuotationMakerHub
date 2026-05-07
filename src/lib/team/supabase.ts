import type { SupabaseClient } from "@supabase/supabase-js";

import {
  localWorkspaceRoleForClerkOrgRole,
  parseLocalWorkspaceRole,
  personalWorkspaceRef,
  type LocalWorkspaceRole,
} from "@/lib/auth/workspaces";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ensureWorkspace,
  type QuoterContext,
} from "@/lib/quotes/supabase-store";

type OrganizationLookupRow = {
  id: string;
  clerk_org_id: string | null;
  name: string;
};

export type TeamWorkspaceMigrationResult =
  | { ok: true; workspaceId: string }
  | { ok: false; code: "TEAM_WORKSPACE_EXISTS" };

export async function migratePersonalWorkspaceToTeam(input: {
  ownerUserId: string;
  teamWorkspaceRef: string;
  teamName: string;
}): Promise<TeamWorkspaceMigrationResult> {
  const db = createSupabaseAdminClient();
  const personalRef = personalWorkspaceRef(input.ownerUserId);
  const personalWorkspace = await ensureWorkspace(db, {
    clerkUserId: input.ownerUserId,
    organizationId: personalRef,
    isPersonalWorkspace: true,
  });
  const existingTeamWorkspace = await getOrganizationByWorkspaceRef(
    db,
    input.teamWorkspaceRef,
  );

  if (existingTeamWorkspace && existingTeamWorkspace.id !== personalWorkspace.id) {
    return { ok: false, code: "TEAM_WORKSPACE_EXISTS" };
  }

  const { error: workspaceError } = await db
    .from("organizations")
    .update({
      clerk_org_id: input.teamWorkspaceRef,
      name: input.teamName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personalWorkspace.id);

  throwIfError(workspaceError, "Convert personal workspace to team workspace");

  await upsertLocalMembership(db, {
    organizationId: personalWorkspace.id,
    clerkUserId: input.ownerUserId,
    role: "owner",
    preserveOwner: true,
  });

  return { ok: true, workspaceId: personalWorkspace.id };
}

export async function getLocalWorkspaceRole(
  quoter: QuoterContext,
): Promise<LocalWorkspaceRole | undefined> {
  const db = createSupabaseAdminClient();
  const workspace = await ensureWorkspace(db, quoter);
  const { data, error } = await db
    .from("organization_members")
    .select("role")
    .eq("organization_id", workspace.id)
    .eq("clerk_user_id", quoter.clerkUserId)
    .maybeSingle();

  throwIfError(error, "Read local workspace role");

  return parseLocalWorkspaceRole((data as { role?: unknown } | null)?.role);
}

export async function syncClerkOrganization(input: {
  workspaceRef: string;
  name: string;
}) {
  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await db.from("organizations").upsert(
    {
      clerk_org_id: input.workspaceRef,
      name: input.name,
      updated_at: now,
    },
    { onConflict: "clerk_org_id" },
  );

  throwIfError(error, "Sync Clerk organization");
}

export async function syncClerkOrganizationMembership(input: {
  workspaceRef: string;
  workspaceName: string;
  clerkUserId: string;
  clerkOrgRole?: string | null;
}) {
  const db = createSupabaseAdminClient();
  const organization = await ensureSyncedOrganization(db, {
    workspaceRef: input.workspaceRef,
    workspaceName: input.workspaceName,
  });

  await upsertLocalMembership(db, {
    organizationId: organization.id,
    clerkUserId: input.clerkUserId,
    role: localWorkspaceRoleForClerkOrgRole(input.clerkOrgRole),
    preserveOwner: true,
  });
}

export async function deleteClerkOrganizationMembership(input: {
  workspaceRef: string;
  clerkUserId: string;
}) {
  const db = createSupabaseAdminClient();
  const organization = await getOrganizationByWorkspaceRef(db, input.workspaceRef);

  if (!organization) {
    return;
  }

  const { error } = await db
    .from("organization_members")
    .delete()
    .eq("organization_id", organization.id)
    .eq("clerk_user_id", input.clerkUserId);

  throwIfError(error, "Delete synced organization membership");
}

export async function deleteUserMemberships(clerkUserId: string) {
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from("organization_members")
    .delete()
    .eq("clerk_user_id", clerkUserId);

  throwIfError(error, "Delete user organization memberships");
}

async function ensureSyncedOrganization(
  db: SupabaseClient,
  input: { workspaceRef: string; workspaceName: string },
) {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("organizations")
    .upsert(
      {
        clerk_org_id: input.workspaceRef,
        name: input.workspaceName,
        updated_at: now,
      },
      { onConflict: "clerk_org_id" },
    )
    .select("id, clerk_org_id, name")
    .single();

  throwIfError(error, "Ensure synced organization");

  return data as OrganizationLookupRow;
}

async function getOrganizationByWorkspaceRef(
  db: SupabaseClient,
  workspaceRef: string,
) {
  const { data, error } = await db
    .from("organizations")
    .select("id, clerk_org_id, name")
    .eq("clerk_org_id", workspaceRef)
    .maybeSingle();

  throwIfError(error, "Find organization by workspace reference");

  return data as OrganizationLookupRow | null;
}

async function upsertLocalMembership(
  db: SupabaseClient,
  input: {
    organizationId: string;
    clerkUserId: string;
    role: LocalWorkspaceRole;
    preserveOwner: boolean;
  },
) {
  const { data: existing, error: existingError } = await db
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("clerk_user_id", input.clerkUserId)
    .maybeSingle();

  throwIfError(existingError, "Read existing organization membership");

  const existingRole = parseLocalWorkspaceRole(
    (existing as { role?: unknown } | null)?.role,
  );

  if (input.preserveOwner && existingRole === "owner") {
    return;
  }

  const { error } = await db.from("organization_members").upsert(
    {
      organization_id: input.organizationId,
      clerk_user_id: input.clerkUserId,
      role: input.role,
    },
    { onConflict: "organization_id,clerk_user_id" },
  );

  throwIfError(error, "Upsert organization membership");
}

function throwIfError(error: { message?: string } | null, action: string) {
  if (error) {
    throw new Error(`${action} failed: ${error.message ?? "Unknown error"}`);
  }
}
