"use client";

import { useState } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { Button, LinkButton } from "@/components/ui/button";

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type JoinTeamPayload =
  | {
      organization?: {
        id: string;
        name: string;
      };
      alreadyMember?: boolean;
    }
  | ApiErrorPayload;

type TeamMembershipList = {
  data?: Array<{ organization: { id: string } }>;
  revalidate?: () => Promise<unknown>;
};

const MEMBERSHIP_REVALIDATE_ATTEMPTS = 6;
const MEMBERSHIP_REVALIDATE_DELAY_MS = 350;

export function JoinTeamCard({
  organization,
  token,
}: {
  organization: {
    id: string;
    name: string;
  };
  token: string;
}) {
  const router = useRouter();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 20,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function joinTeam() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(
        `/api/team/join-link/${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const payload = (await readPayload(response)) as JoinTeamPayload;

      if (
        !response.ok ||
        !("organization" in payload) ||
        !payload.organization
      ) {
        setError(readApiError(payload, "Team workspace could not be joined."));
        setLoading(false);
        return;
      }

      setStatus(
        payload.alreadyMember
          ? "Opening team workspace..."
          : "Team joined. Opening workspace...",
      );

      try {
        if (isLoaded && setActive) {
          await waitForTeamMembership(userMemberships, payload.organization.id);
          await setActive({
            organization: payload.organization.id,
            redirectUrl: "/dashboard",
          });
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } catch {
        router.push("/dashboard");
        router.refresh();
      }
      setLoading(false);
    } catch {
      setError("Team workspace could not be joined.");
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6">
      <div className="flex size-11 items-center justify-center rounded-md bg-stone-100">
        <Users className="size-5 text-stone-700" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-stone-950">
        Join {organization.name}
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        Join this team workspace to access its quote dashboard, templates, and
        line-item data.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button
          loading={loading}
          loadingText="Joining..."
          type="button"
          onClick={joinTeam}
        >
          <Users className="size-4" />
          Join team
        </Button>
        <LinkButton href="/dashboard" variant="secondary">
          Back to dashboard
        </LinkButton>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
      ) : null}
      {status ? (
        <p className="mt-3 text-sm font-medium text-emerald-700">{status}</p>
      ) : null}
    </section>
  );
}

async function waitForTeamMembership(
  memberships: TeamMembershipList,
  organizationId: string,
) {
  for (let attempt = 0; attempt < MEMBERSHIP_REVALIDATE_ATTEMPTS; attempt += 1) {
    await memberships.revalidate?.();

    if (hasTeamMembership(memberships, organizationId)) {
      return;
    }

    if (attempt < MEMBERSHIP_REVALIDATE_ATTEMPTS - 1) {
      await delay(MEMBERSHIP_REVALIDATE_DELAY_MS);
    }
  }
}

function hasTeamMembership(
  memberships: TeamMembershipList,
  organizationId: string,
) {
  return memberships.data?.some(
    (membership) => membership.organization.id === organizationId,
  );
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function readPayload(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function readApiError(payload: ApiErrorPayload | object, fallback: string) {
  return "error" in payload && payload.error?.message
    ? payload.error.message
    : fallback;
}
