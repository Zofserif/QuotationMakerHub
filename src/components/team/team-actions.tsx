"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Copy,
  Link as LinkIcon,
  RotateCw,
  Save,
  Trash2,
  Unlink,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamJoinLinkSummary } from "@/lib/team/join-links";

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type TeamMembershipList = {
  data?: Array<{ organization: { id: string } }>;
  revalidate?: () => Promise<unknown>;
};

const MEMBERSHIP_REVALIDATE_ATTEMPTS = 4;
const MEMBERSHIP_REVALIDATE_DELAY_MS = 350;

export function EnableTeamWorkspaceForm({
  defaultName,
}: {
  defaultName: string;
}) {
  const router = useRouter();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 20,
    },
  });
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    let organizationId: string;

    try {
      const response = await fetch("/api/team/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as
        | { organizationId?: string }
        | ApiErrorPayload;

      if (
        !response.ok ||
        !("organizationId" in payload) ||
        !payload.organizationId
      ) {
        setError(readApiError(payload, "Team workspace could not be enabled."));
        setLoading(false);
        return;
      }

      organizationId = payload.organizationId;
    } catch {
      setError("Team workspace could not be enabled.");
      setLoading(false);
      return;
    }

    try {
      if (isLoaded && setActive) {
        await waitForTeamMembership(userMemberships, organizationId);
        await setActive({
          organization: organizationId,
          redirectUrl: "/team",
        });
      } else {
        router.push("/team");
        router.refresh();
      }
    } catch {
      router.push("/team");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="rounded-lg border border-stone-200 bg-white p-4"
      onSubmit={submit}
    >
      <label className="text-sm font-medium text-stone-700" htmlFor="team-name">
        Team workspace name
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          id="team-name"
          maxLength={120}
          minLength={2}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button loading={loading} loadingText="Enabling..." type="submit">
          <Users className="size-4" />
          Enable team
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </form>
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

export function UpdateTeamWorkspaceNameForm({
  defaultName,
}: {
  defaultName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/team/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as
        | { organizationName?: string }
        | ApiErrorPayload;

      if (!response.ok) {
        setError(readApiError(payload, "Team name could not be updated."));
        return;
      }

      if ("organizationName" in payload && payload.organizationName) {
        setName(payload.organizationName);
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Team name could not be updated.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="rounded-lg border border-stone-200 bg-white p-4"
      onSubmit={submit}
    >
      <label className="text-sm font-medium text-stone-700" htmlFor="team-name">
        Team workspace name
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          id="team-name"
          maxLength={120}
          minLength={2}
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
        />
        <Button loading={loading} loadingText="Saving..." type="submit">
          <Save className="size-4" />
          Save name
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
      ) : null}
      {saved ? (
        <p className="mt-3 text-sm font-medium text-emerald-700">
          Team name updated.
        </p>
      ) : null}
    </form>
  );
}

export function TeamJoinLinkPanel({
  initialJoinLink,
}: {
  initialJoinLink: TeamJoinLinkSummary | null;
}) {
  const router = useRouter();
  const [joinLink, setJoinLink] = useState(initialJoinLink);
  const [loadingAction, setLoadingAction] = useState<
    "generate" | "rotate" | "revoke" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function saveJoinLink(rotate: boolean) {
    setLoadingAction(rotate ? "rotate" : "generate");
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/team/join-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotate }),
      });
      const payload = (await readPayload(response)) as
        | { joinLink?: TeamJoinLinkSummary | null }
        | ApiErrorPayload;

      if (!response.ok || !("joinLink" in payload) || !payload.joinLink) {
        setError(readApiError(payload, "Team join link could not be updated."));
        return;
      }

      setJoinLink(payload.joinLink);
      router.refresh();
    } catch {
      setError("Team join link could not be updated.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function disableJoinLink() {
    setLoadingAction("revoke");
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/team/join-link", {
        method: "DELETE",
      });
      const payload = (await readPayload(response)) as ApiErrorPayload;

      if (!response.ok) {
        setError(readApiError(payload, "Team join link could not be disabled."));
        return;
      }

      setJoinLink(null);
      router.refresh();
    } catch {
      setError("Team join link could not be disabled.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function copyJoinLink() {
    if (!joinLink) {
      return;
    }

    setError(null);

    try {
      await copyText(toAbsoluteUrl(joinLink.url));
      setCopied(true);
    } catch {
      setError("Team join link could not be copied.");
    }
  }

  if (!joinLink) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm font-medium text-stone-600">
            No active join link.
          </p>
          <Button
            loading={loadingAction === "generate"}
            loadingText="Generating..."
            type="button"
            onClick={() => saveJoinLink(false)}
          >
            <LinkIcon className="size-4" />
            Generate link
          </Button>
        </div>
        {error ? (
          <p className="text-sm font-medium text-red-700">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          aria-label="Team join link"
          value={joinLink.url}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button type="button" variant="secondary" onClick={copyJoinLink}>
          <Copy className="size-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          loading={loadingAction === "rotate"}
          loadingText="Regenerating..."
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => saveJoinLink(true)}
        >
          <RotateCw className="size-4" />
          Regenerate
        </Button>
        <Button
          loading={loadingAction === "revoke"}
          loadingText="Disabling..."
          size="sm"
          type="button"
          variant="ghost"
          onClick={disableJoinLink}
        >
          <Unlink className="size-4" />
          Disable
        </Button>
        <p className="text-xs font-medium text-stone-400">
          Created {formatShortDate(joinLink.createdAt)}
          {joinLink.lastUsedAt
            ? ` · Last used ${formatShortDate(joinLink.lastUsedAt)}`
            : ""}
        </p>
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

export function RemoveMemberButton({ userId }: { userId: string }) {
  return (
    <TeamDeleteButton
      actionLabel="Remove member"
      endpoint={`/api/team/members/${encodeURIComponent(userId)}`}
    />
  );
}

function TeamDeleteButton({
  actionLabel,
  endpoint,
}: {
  actionLabel: string;
  endpoint: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);

    try {
      const response = await fetch(endpoint, { method: "DELETE" });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      aria-label={actionLabel}
      loading={loading}
      size="icon"
      title={actionLabel}
      type="button"
      variant="ghost"
      onClick={remove}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function readApiError(payload: ApiErrorPayload | object, fallback: string) {
  return "error" in payload && payload.error?.message
    ? payload.error.message
    : fallback;
}

async function readPayload(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Copy command failed");
  }
}

function toAbsoluteUrl(value: string) {
  return value.startsWith("/") ? `${window.location.origin}${value}` : value;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
