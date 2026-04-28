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

export function QuoteVisibilityActions({
  quoteId,
  visibility,
}: {
  quoteId: string;
  visibility: QuoteVisibility;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingVisibility, setPendingVisibility] =
    useState<QuoteVisibility | null>(null);
  const isPending = pendingVisibility !== null;

  async function updateVisibility(nextVisibility: QuoteVisibility) {
    if (
      nextVisibility === "deleted" &&
      !window.confirm(
        "This will hide the quote from normal lists, but it will remain in the database and can be restored from the Deleted tab.",
      )
    ) {
      return;
    }

    setPendingVisibility(nextVisibility);

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
      setPendingVisibility(null);
    }
  }

  return (
    <>
      {visibility === "active" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            loading={pendingVisibility === "archived"}
            loadingText="Archiving..."
            onClick={() => void updateVisibility("archived")}
          >
            <Archive className="size-4" />
            Archive
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isPending}
            loading={pendingVisibility === "deleted"}
            loadingText="Deleting..."
            onClick={() => void updateVisibility("deleted")}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </>
      ) : null}

      {visibility === "archived" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            loading={pendingVisibility === "active"}
            loadingText="Restoring..."
            onClick={() => void updateVisibility("active")}
          >
            <RotateCcw className="size-4" />
            Restore
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isPending}
            loading={pendingVisibility === "deleted"}
            loadingText="Deleting..."
            onClick={() => void updateVisibility("deleted")}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </>
      ) : null}

      {visibility === "deleted" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          loading={pendingVisibility === "active"}
          loadingText="Restoring..."
          onClick={() => void updateVisibility("active")}
        >
          <RotateCcw className="size-4" />
          Restore
        </Button>
      ) : null}

      {message ? (
        <span className="basis-full text-right text-xs font-medium text-red-600">
          {message}
        </span>
      ) : null}
    </>
  );
}
