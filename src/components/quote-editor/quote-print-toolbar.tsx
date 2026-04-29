"use client";

import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
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
  quoteId,
  versionNumber,
  paperSize,
  signatureMode,
}: {
  allowSignatureModeToggle?: boolean;
  quoteId: string;
  versionNumber?: number;
  paperSize: QuotePaperSize;
  signatureMode: QuoteSignatureMode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
    <section className="no-print rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            Paper size
            <select
              className={selectClassName}
              disabled={isPending}
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
                    disabled={isPending}
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

        <Button
          disabled={isPending}
          loading={isPending}
          loadingText="Updating"
          type="button"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Print / Export PDF
        </Button>
      </div>
    </section>
  );
}
