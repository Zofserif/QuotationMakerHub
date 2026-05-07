"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Send, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

export function EnableTeamWorkspaceForm({
  defaultName,
}: {
  defaultName: string;
}) {
  const router = useRouter();
  const { isLoaded, setActive } = useOrganizationList();
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

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
        return;
      }

      if (isLoaded && setActive) {
        await setActive({
          organization: payload.organizationId,
          redirectUrl: "/team",
        });
      } else {
        router.push("/team");
        router.refresh();
      }
    } catch {
      setError("Team workspace could not be enabled.");
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

export function TeamInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as ApiErrorPayload;

      if (!response.ok) {
        setError(readApiError(payload, "Invitation could not be sent."));
        return;
      }

      setEmail("");
      router.refresh();
    } catch {
      setError("Invitation could not be sent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
      <Input
        required
        aria-label="Teammate email"
        placeholder="teammate@example.com"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button loading={loading} loadingText="Sending..." type="submit">
        <Send className="size-4" />
        Invite
      </Button>
      {error ? (
        <p className="text-sm font-medium text-red-700 sm:basis-full">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function RevokeInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  return (
    <TeamDeleteButton
      actionLabel="Revoke invitation"
      endpoint={`/api/team/invitations/${encodeURIComponent(invitationId)}`}
    />
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
