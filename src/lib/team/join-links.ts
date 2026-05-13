import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";

import { APP_ORIGIN } from "@/lib/app-config";
import {
  createClientAccessToken,
  hashClientAccessToken,
} from "@/lib/client-links/token";
import { isClerkConfigured } from "@/lib/auth/clerk";
import { readRemoteQuoteMetadata } from "@/lib/billing/metadata";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncClerkOrganizationMembership } from "@/lib/team/supabase";

type LocalOrganizationRow = {
  id: string;
  clerk_org_id: string | null;
  name: string;
};

type TeamJoinLinkRow = {
  id: string;
  organization_id: string;
  token: string;
  token_hash: string;
  created_by_clerk_user_id: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
};

type TeamJoinLinkTarget = {
  linkId: string;
  workspaceRef: string;
};

export type TeamJoinLinkSummary = {
  url: string;
  createdAt: string;
  lastUsedAt?: string;
};

export type TeamJoinLinkPreview = {
  organization: {
    id: string;
    name: string;
  };
};

export type TeamJoinResult = {
  organization: {
    id: string;
    name: string;
  };
  alreadyMember: boolean;
};

export class TeamJoinLinkError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "TeamJoinLinkError";
    this.code = code;
    this.status = status;
  }
}

export async function getActiveTeamJoinLink(input: {
  workspaceRef: string;
}): Promise<TeamJoinLinkSummary | null> {
  const db = createSupabaseAdminClient();
  const organization = await getLocalOrganizationByWorkspaceRef(
    db,
    input.workspaceRef,
  );

  if (!organization) {
    return null;
  }

  const link = await getActiveLinkByOrganizationId(db, organization.id);

  return link ? mapTeamJoinLink(link) : null;
}

export async function ensureTeamJoinLink(input: {
  workspaceRef: string;
  createdByClerkUserId: string;
  rotate: boolean;
}): Promise<TeamJoinLinkSummary> {
  const db = createSupabaseAdminClient();
  const organization = await getLocalOrganizationByWorkspaceRef(
    db,
    input.workspaceRef,
  );

  if (!organization) {
    throw new TeamJoinLinkError(
      "TEAM_WORKSPACE_NOT_FOUND",
      "Team workspace could not be found.",
      404,
    );
  }

  if (input.rotate) {
    await revokeActiveLinksByOrganizationId(db, organization.id);
  } else {
    const existingLink = await getActiveLinkByOrganizationId(
      db,
      organization.id,
    );

    if (existingLink) {
      return mapTeamJoinLink(existingLink);
    }
  }

  const token = createClientAccessToken();
  const { data, error } = await db
    .from("team_join_links")
    .insert({
      organization_id: organization.id,
      token,
      token_hash: hashClientAccessToken(token),
      created_by_clerk_user_id: input.createdByClerkUserId,
    })
    .select(
      "id, organization_id, token, token_hash, created_by_clerk_user_id, created_at, revoked_at, last_used_at",
    )
    .single();

  if (error && isUniqueViolation(error) && !input.rotate) {
    const existingLink = await getActiveLinkByOrganizationId(db, organization.id);

    if (existingLink) {
      return mapTeamJoinLink(existingLink);
    }
  }

  throwIfError(error, "Create team join link");

  return mapTeamJoinLink(data as TeamJoinLinkRow);
}

export async function revokeActiveTeamJoinLink(input: {
  workspaceRef: string;
}) {
  const db = createSupabaseAdminClient();
  const organization = await getLocalOrganizationByWorkspaceRef(
    db,
    input.workspaceRef,
  );

  if (!organization) {
    return;
  }

  await revokeActiveLinksByOrganizationId(db, organization.id);
}

export async function getTeamJoinLinkPreview(
  token: string,
): Promise<TeamJoinLinkPreview | null> {
  const db = createSupabaseAdminClient();
  const target = await getTeamJoinLinkTarget(db, token);

  if (!target || !isClerkConfigured()) {
    return null;
  }

  const organization = await getActiveYearlyTeamOrganization(
    target.workspaceRef,
  ).catch(() => null);

  if (!organization) {
    return null;
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
    },
  };
}

export async function joinTeamWithLink(input: {
  token: string;
  clerkUserId: string;
}): Promise<TeamJoinResult> {
  if (!isClerkConfigured()) {
    throw new TeamJoinLinkError(
      "TEAM_JOIN_LINK_UNAVAILABLE",
      "Team join links require Clerk to be configured.",
      503,
    );
  }

  const db = createSupabaseAdminClient();
  const target = await getTeamJoinLinkTarget(db, input.token);

  if (!target) {
    throw new TeamJoinLinkError(
      "TEAM_JOIN_LINK_NOT_FOUND",
      "This team join link is invalid or no longer active.",
      404,
    );
  }

  const clerk = await clerkClient();
  const organization = await getActiveYearlyTeamOrganization(
    target.workspaceRef,
  );
  const existingMembership = await findUserOrganizationMembership(clerk, {
    organizationId: organization.id,
    userId: input.clerkUserId,
  });

  if (existingMembership) {
    await syncJoinedMembership({
      workspaceRef: organization.id,
      workspaceName: organization.name,
      clerkUserId: input.clerkUserId,
      clerkOrgRole: existingMembership.role,
    });
    await markTeamJoinLinkUsed(db, target.linkId);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      alreadyMember: true,
    };
  }

  try {
    const membership = await clerk.organizations.createOrganizationMembership({
      organizationId: organization.id,
      userId: input.clerkUserId,
      role: "org:member",
    });

    await syncJoinedMembership({
      workspaceRef: organization.id,
      workspaceName: organization.name,
      clerkUserId: input.clerkUserId,
      clerkOrgRole: membership.role,
    });
    await markTeamJoinLinkUsed(db, target.linkId);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      alreadyMember: false,
    };
  } catch (error) {
    const membership = await findUserOrganizationMembership(clerk, {
      organizationId: organization.id,
      userId: input.clerkUserId,
    }).catch(() => null);

    if (membership) {
      await syncJoinedMembership({
        workspaceRef: organization.id,
        workspaceName: organization.name,
        clerkUserId: input.clerkUserId,
        clerkOrgRole: membership.role,
      });
      await markTeamJoinLinkUsed(db, target.linkId);

      return {
        organization: {
          id: organization.id,
          name: organization.name,
        },
        alreadyMember: true,
      };
    }

    if (isClerkAPIResponseError(error)) {
      throw new TeamJoinLinkError(
        "TEAM_JOIN_FAILED",
        safeClerkMessage(error.errors[0]?.message) ??
          "Team membership could not be created.",
        error.status >= 400 && error.status < 500 ? 400 : 500,
      );
    }

    throw error;
  }
}

async function syncJoinedMembership(input: {
  workspaceRef: string;
  workspaceName: string;
  clerkUserId: string;
  clerkOrgRole?: string | null;
}) {
  await syncClerkOrganizationMembership(input);
}

async function getActiveYearlyTeamOrganization(workspaceRef: string) {
  const clerk = await clerkClient();
  const organization = await clerk.organizations.getOrganization({
    organizationId: workspaceRef,
  });
  const { plan, renewsAt } = readRemoteQuoteMetadata(
    organization.privateMetadata,
  );

  if (plan !== "partner_yearly" || !isNowBeforeOrEqual(renewsAt)) {
    throw new TeamJoinLinkError(
      "TEAM_JOIN_LINK_UNAVAILABLE",
      "This team workspace is not available for new members.",
      403,
    );
  }

  return organization;
}

async function findUserOrganizationMembership(
  clerk: Awaited<ReturnType<typeof clerkClient>>,
  input: { organizationId: string; userId: string },
) {
  const limit = 100;
  let offset = 0;

  while (true) {
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId: input.userId,
      limit,
      offset,
    });
    const membership = memberships.data.find(
      ({ organization }) => organization.id === input.organizationId,
    );

    if (membership) {
      return membership;
    }

    offset += memberships.data.length;

    if (!memberships.data.length || offset >= memberships.totalCount) {
      return null;
    }
  }
}

async function getTeamJoinLinkTarget(
  db: ReturnType<typeof createSupabaseAdminClient>,
  token: string,
): Promise<TeamJoinLinkTarget | null> {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return null;
  }

  const { data: link, error: linkError } = await db
    .from("team_join_links")
    .select(
      "id, organization_id, token, token_hash, created_by_clerk_user_id, created_at, revoked_at, last_used_at",
    )
    .eq("token_hash", hashClientAccessToken(trimmedToken))
    .is("revoked_at", null)
    .maybeSingle();

  throwIfError(linkError, "Read team join link");

  if (!link) {
    return null;
  }

  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("id, clerk_org_id, name")
    .eq("id", (link as TeamJoinLinkRow).organization_id)
    .maybeSingle();

  throwIfError(organizationError, "Read team join link organization");

  const localOrganization = organization as LocalOrganizationRow | null;

  if (!localOrganization?.clerk_org_id) {
    return null;
  }

  return {
    linkId: (link as TeamJoinLinkRow).id,
    workspaceRef: localOrganization.clerk_org_id,
  };
}

async function getLocalOrganizationByWorkspaceRef(
  db: ReturnType<typeof createSupabaseAdminClient>,
  workspaceRef: string,
) {
  const { data, error } = await db
    .from("organizations")
    .select("id, clerk_org_id, name")
    .eq("clerk_org_id", workspaceRef)
    .maybeSingle();

  throwIfError(error, "Read team workspace");

  return data as LocalOrganizationRow | null;
}

async function getActiveLinkByOrganizationId(
  db: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
) {
  const { data, error } = await db
    .from("team_join_links")
    .select(
      "id, organization_id, token, token_hash, created_by_clerk_user_id, created_at, revoked_at, last_used_at",
    )
    .eq("organization_id", organizationId)
    .is("revoked_at", null)
    .maybeSingle();

  throwIfError(error, "Read active team join link");

  return data as TeamJoinLinkRow | null;
}

async function revokeActiveLinksByOrganizationId(
  db: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
) {
  const { error } = await db
    .from("team_join_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .is("revoked_at", null);

  throwIfError(error, "Revoke team join link");
}

async function markTeamJoinLinkUsed(
  db: ReturnType<typeof createSupabaseAdminClient>,
  linkId: string,
) {
  const { error } = await db
    .from("team_join_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", linkId);

  throwIfError(error, "Mark team join link used");
}

function mapTeamJoinLink(link: TeamJoinLinkRow): TeamJoinLinkSummary {
  return {
    url: buildTeamJoinUrl(link.token),
    createdAt: link.created_at,
    lastUsedAt: link.last_used_at ?? undefined,
  };
}

function buildTeamJoinUrl(token: string) {
  const path = `/join-team/${encodeURIComponent(token)}`;

  return APP_ORIGIN ? `${APP_ORIGIN}${path}` : path;
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

function isNowBeforeOrEqual(value?: string) {
  if (!value) {
    return true;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && Date.now() <= date.getTime();
}

function safeClerkMessage(message?: string) {
  const trimmedMessage = message?.trim();

  return trimmedMessage ? trimmedMessage : undefined;
}

function throwIfError(error: { message?: string } | null, action: string) {
  if (error) {
    throw new Error(`${action} failed: ${error.message ?? "Unknown error"}`);
  }
}
