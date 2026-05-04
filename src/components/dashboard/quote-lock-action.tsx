"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuoteStatus } from "@/lib/quotes/types";

type LockQuotePayload = {
  status?: QuoteStatus;
  error?: {
    message?: string;
  };
};

export function QuoteLockAction({
  quoteId,
  status,
}: {
  quoteId: string;
  status: QuoteStatus;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (status !== "for_wet_signature") {
    return null;
  }

  async function lockQuote() {
    if (
      !window.confirm(
        "Lock this wet-signature quote? This will prevent further edits and signing links. Recipient acceptance records will not be changed.",
      )
    ) {
      return;
    }

    setIsPending(true);

    try {
      setMessage(null);
      const response = await fetch(
        `/api/quotes/${encodeURIComponent(quoteId)}/lock`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json()) as LockQuotePayload;

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Could not lock quote.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Could not lock quote.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        loading={isPending}
        loadingText="Locking..."
        onClick={() => void lockQuote()}
      >
        <Lock className="size-4" />
        Lock
      </Button>
      {message ? (
        <span className="basis-full text-right text-xs font-medium text-red-600">
          {message}
        </span>
      ) : null}
    </>
  );
}
