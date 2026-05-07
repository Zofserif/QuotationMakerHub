"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { useAuth, useOrganizationList, useUser } from "@clerk/nextjs";

export function WorkspaceSwitcher() {
  const { orgId } = useAuth();
  const { user } = useUser();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 20,
    },
  });
  const [switching, setSwitching] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex h-9 w-44 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3">
        <div className="size-4 animate-pulse rounded bg-stone-200" />
        <div className="h-3 flex-1 animate-pulse rounded bg-stone-200" />
      </div>
    );
  }

  const memberships = userMemberships.data ?? [];
  const selectedValue = orgId ?? "personal";
  const personalLabel =
    user?.primaryEmailAddress?.emailAddress ??
    user?.fullName ??
    "Personal workspace";

  async function switchWorkspace(value: string) {
    setSwitching(true);

    try {
      if (!setActive) {
        return;
      }

      await setActive({
        organization: value === "personal" ? null : value,
        redirectUrl: "/dashboard",
      });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <label className="flex min-w-0 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5">
      <Building2 className="size-4 shrink-0 text-stone-500" />
      <span className="sr-only">Workspace</span>
      <select
        className="h-6 min-w-0 max-w-[52vw] bg-transparent text-sm font-medium text-stone-800 outline-none disabled:opacity-60 sm:max-w-56"
        disabled={switching}
        value={selectedValue}
        onChange={(event) => switchWorkspace(event.target.value)}
      >
        <option value="personal">{personalLabel}</option>
        {memberships.map((membership) => (
          <option key={membership.id} value={membership.organization.id}>
            {membership.organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
