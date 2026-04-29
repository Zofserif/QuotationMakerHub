"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuoteVisibility } from "@/lib/quotes/types";

type VisibilityPayload = {
  visibility?: QuoteVisibility;
  error?: {
    message?: string;
  };
};

type DeletePayload = {
  deleted?: boolean;
  error?: {
    message?: string;
  };
};

type VisibilityAction = "archive" | "delete" | "restore";

export function QuoteVisibilityActions({
  quoteId,
  visibility,
}: {
  quoteId: string;
  visibility: QuoteVisibility;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<VisibilityAction | null>(
    null,
  );
  const isPending = pendingAction !== null;

  async function updateVisibility(
    nextVisibility: QuoteVisibility,
    action: VisibilityAction,
  ) {
    setPendingAction(action);

    try {
      setMessage(null);
      const response = await fetch(`/api/quotes/${quoteId}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visibility: nextVisibility }),
      });
      const payload = (await response.json()) as VisibilityPayload;

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Could not update quote.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Could not update quote.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteArchivedQuote() {
    if (
      !window.confirm(
        "This will permanently delete this archived quote from the database. This action cannot be undone.",
      )
    ) {
      return;
    }

    setPendingAction("delete");

    try {
      setMessage(null);
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as DeletePayload;

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Could not delete quote.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Could not delete quote.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      {visibility === "active" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          loading={pendingAction === "archive"}
          loadingText="Archiving..."
          onClick={() => void updateVisibility("archived", "archive")}
        >
          <Archive className="size-4" />
          Archive
        </Button>
      ) : null}

      {visibility !== "active" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            loading={pendingAction === "restore"}
            loadingText="Restoring..."
            onClick={() => void updateVisibility("active", "restore")}
          >
            <RotateCcw className="size-4" />
            Restore
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isPending}
            loading={pendingAction === "delete"}
            loadingText="Deleting..."
            onClick={() => void deleteArchivedQuote()}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </>
      ) : null}

      {message ? (
        <span className="basis-full text-right text-xs font-medium text-red-600">
          {message}
        </span>
      ) : null}
    </>
  );
}
