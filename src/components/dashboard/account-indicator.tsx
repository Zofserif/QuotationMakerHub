"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export function AccountIndicator() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div
        aria-label="Loading account"
        className="flex min-w-0 items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2"
      >
        <div className="size-8 shrink-0 animate-pulse rounded-full bg-stone-200" />
        <div className="min-w-0 space-y-1">
          <div className="h-3 w-16 animate-pulse rounded bg-stone-200" />
          <div className="h-3 w-32 max-w-[46vw] animate-pulse rounded bg-stone-200 sm:w-40" />
        </div>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
        Not signed in
      </div>
    );
  }

  const accountLabel =
    user.primaryEmailAddress?.emailAddress ??
    user.fullName ??
    user.username ??
    "Signed-in account";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <UserButton />
      <div className="min-w-0 leading-tight">
        <p className="text-xs font-medium text-stone-500">Signed in as</p>
        <p
          className="max-w-[42vw] truncate text-sm font-semibold text-stone-950 sm:max-w-48 md:max-w-64"
          title={accountLabel}
        >
          {accountLabel}
        </p>
      </div>
    </div>
  );
}
