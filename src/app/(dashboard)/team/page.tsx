import { ShieldAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import {
  EnableTeamWorkspaceForm,
  RemoveMemberButton,
  RevokeInvitationButton,
  TeamInviteForm,
  UpdateTeamWorkspaceNameForm,
} from "@/components/team/team-actions";
import { isClerkConfigured } from "@/lib/auth/clerk";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  getCreatedTeamWorkspace,
  getTeamWorkspaceSummary,
} from "@/lib/team/clerk";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const hasClerk = isClerkConfigured();
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);
  const createdTeam = hasClerk
    ? await getCreatedTeamWorkspace(quoter.clerkUserId)
    : null;
  const team = await getTeamWorkspaceSummary(quoter, entitlement);

  return (
    <div className="space-y-4">
      <section>
        <p className="text-sm font-medium text-stone-500">Workspace</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">Team access</h1>
      </section>

      {!hasClerk ? (
        <Notice
          message="Team access requires Clerk Organizations to be configured."
          title="Clerk is not configured"
        />
      ) : team ? (
        <TeamWorkspacePanel
          canManageTeam={entitlement.canManageTeam}
          canRenameTeam={
            entitlement.canManageTeam && team.isCreatedByCurrentUser
          }
          team={team}
        />
      ) : entitlement.canCreateTeamWorkspace && !createdTeam ? (
        <section className="space-y-3">
          <Notice
            message="Create a shared workspace for your team. Existing quotes, templates, and line-item data stay in this dashboard."
            title="Enable team workspace"
          />
          <EnableTeamWorkspaceForm defaultName="Remote Quote Team" />
        </section>
      ) : entitlement.isTeamWorkspace ? (
        <Notice
          message={
            entitlement.paidPlanExpiredAt
              ? "This team workspace's yearly partner renewal has expired."
              : "This workspace needs an active Yearly Partner plan before team access is available."
          }
          title="Yearly partner required"
        />
      ) : createdTeam ? (
        entitlement.isYearlyPartnerWorkspace ? (
          <CreatedTeamWorkspacePanel team={createdTeam} />
        ) : (
          <Notice
            message="Renew your Yearly Partner plan before updating your team workspace."
            title="Yearly partner required"
          />
        )
      ) : (
        <Notice
          actionHref="/dashboard"
          actionLabel="Back to dashboard"
          message="You can join a team dashboard after the Yearly Partner workspace owner invites you. Use the workspace switcher in the header after accepting an invitation."
          title="No team workspace selected"
        />
      )}
    </div>
  );
}

function TeamWorkspacePanel({
  canManageTeam,
  canRenameTeam,
  team,
}: {
  canManageTeam: boolean;
  canRenameTeam: boolean;
  team: NonNullable<Awaited<ReturnType<typeof getTeamWorkspaceSummary>>>;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-stone-950">
                {team.organizationName}
              </h2>
              <Badge>Yearly team workspace</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Members share the same quote dashboard, templates, and line-item
              data.
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-stone-100">
            <Users className="size-5 text-stone-700" />
          </div>
        </div>

        {canManageTeam ? (
          <div className="mt-4 border-t border-stone-200 pt-4">
            <TeamInviteForm />
          </div>
        ) : null}
      </div>

      {canRenameTeam ? (
        <UpdateTeamWorkspaceNameForm defaultName={team.organizationName} />
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-white">
        <header className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-semibold text-stone-950">Members</h2>
        </header>
        <div className="divide-y divide-stone-200">
          {team.members.map((member) => (
            <div
              className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]"
              key={member.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-stone-950">
                    {member.name}
                  </p>
                  {member.isOwner ? <Badge>Owner</Badge> : null}
                  {member.isCurrentUser ? <Badge>You</Badge> : null}
                </div>
                <p className="mt-1 truncate text-sm text-stone-500">
                  {member.email}
                </p>
                <p className="mt-1 text-xs font-medium text-stone-400">
                  Joined {formatDate(member.joinedAt)}
                </p>
              </div>
              {canManageTeam && !member.isCurrentUser && member.userId ? (
                <RemoveMemberButton userId={member.userId} />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white">
        <header className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-semibold text-stone-950">Pending invitations</h2>
        </header>
        {team.invitations.length ? (
          <div className="divide-y divide-stone-200">
            {team.invitations.map((invitation) => (
              <div
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]"
                key={invitation.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-950">
                    {invitation.email}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Expires {formatDate(invitation.expiresAt)}
                  </p>
                </div>
                {canManageTeam ? (
                  <RevokeInvitationButton invitationId={invitation.id} />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-sm text-stone-500">
            No pending invitations.
          </p>
        )}
      </div>
    </section>
  );
}

function CreatedTeamWorkspacePanel({
  team,
}: {
  team: NonNullable<Awaited<ReturnType<typeof getCreatedTeamWorkspace>>>;
}) {
  return (
    <section className="space-y-3">
      <Notice
        message={`You already created ${team.organizationName}. You can update its name here, or open it from the workspace switcher to manage members.`}
        title="Team workspace created"
      />
      <UpdateTeamWorkspaceNameForm defaultName={team.organizationName} />
    </section>
  );
}

function Notice({
  actionHref,
  actionLabel,
  message,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  message: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-stone-100">
          <ShieldAlert className="size-5 text-stone-700" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-stone-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">{message}</p>
          {actionHref && actionLabel ? (
            <LinkButton className="mt-3" href={actionHref} size="sm">
              {actionLabel}
            </LinkButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
