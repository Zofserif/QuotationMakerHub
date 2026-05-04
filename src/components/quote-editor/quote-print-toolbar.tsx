"use client";

import { LayoutDashboard, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, LinkButton } from "@/components/ui/button";
import {
  quotePaperSizes,
  quoteSignatureModes,
  type QuotePaperSize,
  type QuoteSignatureMode,
} from "@/lib/quotes/print-options";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-100 disabled:opacity-50";

export function QuotePrintToolbar({
  allowSignatureModeToggle = true,
  markWetSignatureOnPrint = false,
  quoteId,
  versionNumber,
  paperSize,
  signatureMode,
}: {
  allowSignatureModeToggle?: boolean;
  markWetSignatureOnPrint?: boolean;
  quoteId: string;
  versionNumber?: number;
  paperSize: QuotePaperSize;
  signatureMode: QuoteSignatureMode;
}) {
  const router = useRouter();
  const [isUpdatingOptions, startTransition] = useTransition();
  const [isPrintPending, setIsPrintPending] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const isBusy = isUpdatingOptions || isPrintPending;

  function updatePrintOptions(
    nextPaperSize: QuotePaperSize,
    nextSignatureMode: QuoteSignatureMode,
  ) {
    const params = new URLSearchParams();
    params.set("paper", nextPaperSize);
    params.set("signature", nextSignatureMode);

    if (versionNumber) {
      params.set("version", String(versionNumber));
    }

    startTransition(() => {
      router.replace(`/print/quotes/${encodeURIComponent(quoteId)}?${params}`, {
        scroll: false,
      });
    });
  }

  async function handlePrint() {
    setPrintMessage(null);

    if (signatureMode === "wet" && markWetSignatureOnPrint) {
      setIsPrintPending(true);

      try {
        const response = await fetch(
          `/api/quotes/${encodeURIComponent(quoteId)}/wet-signature`,
          {
            method: "POST",
          },
        );
        const payload = (await response.json()) as WetSignaturePayload;

        if (!response.ok) {
          setPrintMessage(
            payload.error?.message ??
              "Could not prepare this quote for wet signature.",
          );
          return;
        }

        router.refresh();
      } catch {
        setPrintMessage("Could not prepare this quote for wet signature.");
        return;
      } finally {
        setIsPrintPending(false);
      }
    }

    window.print();
  }

  return (
    <section className="no-print rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            Paper size
            <select
              className={selectClassName}
              disabled={isBusy}
              value={paperSize}
              onChange={(event) =>
                updatePrintOptions(
                  event.target.value as QuotePaperSize,
                  signatureMode,
                )
              }
            >
              {quotePaperSizes.map((paper) => (
                <option key={paper.value} value={paper.value}>
                  {paper.label}
                </option>
              ))}
            </select>
          </label>

          {allowSignatureModeToggle ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-stone-700">
                Signature style
              </p>
              <div
                aria-label="Signature style"
                className="flex flex-wrap gap-2"
                role="group"
              >
                {quoteSignatureModes.map((mode) => (
                  <button
                    aria-pressed={signatureMode === mode.value}
                    className={cn(
                      "h-10 rounded-md border px-3 text-sm font-medium transition disabled:opacity-50",
                      signatureMode === mode.value
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-200 bg-white text-stone-900 hover:bg-stone-100",
                    )}
                    disabled={isBusy}
                    key={mode.value}
                    type="button"
                    onClick={() => updatePrintOptions(paperSize, mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <LinkButton
            className="w-full sm:w-auto"
            href="/dashboard"
            variant="secondary"
          >
            <LayoutDashboard className="size-4" />
            Back to dashboard
          </LinkButton>
          <Button
            className="w-full sm:w-auto"
            disabled={isBusy}
            loading={isPrintPending}
            loadingText="Preparing"
            type="button"
            onClick={() => {
              void handlePrint();
            }}
          >
            <Printer className="size-4" />
            Print / Export PDF
          </Button>
          {printMessage ? (
            <p className="text-sm font-medium text-red-600">{printMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type WetSignaturePayload = {
  error?: {
    message?: string;
  };
};
