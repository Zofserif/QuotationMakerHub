"use client";

import { UserAvatar, useClerk, useUser } from "@clerk/nextjs";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AccountIndicator() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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
    <div className="relative w-fit min-w-0" ref={menuRef}>
      <button
        type="button"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label={`Open account menu for ${accountLabel}`}
        className="flex min-w-0 items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
      >
        <UserAvatar />
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-medium text-stone-500">Signed in as</p>
          <p
            className="max-w-[42vw] truncate text-sm font-semibold text-stone-950 sm:max-w-48 md:max-w-64"
            title={accountLabel}
          >
            {accountLabel}
          </p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-stone-500 transition-transform ${
            isMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isMenuOpen ? (
        <div
          className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-stone-200 bg-white p-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            onClick={() => {
              setIsMenuOpen(false);
              clerk.openUserProfile();
            }}
            role="menuitem"
          >
            <UserCog aria-hidden="true" className="size-4" />
            Manage account
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            onClick={() => {
              setIsMenuOpen(false);
              void clerk.signOut({ redirectUrl: "/" });
            }}
            role="menuitem"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
