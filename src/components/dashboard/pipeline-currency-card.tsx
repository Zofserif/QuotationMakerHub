"use client";

import { useState } from "react";
import { RefreshCw, Save, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  normalizeCurrency,
  supportedCurrencies,
  type SupportedCurrencyCode,
} from "@/lib/currency";

type PipelineCurrencyCardProps = {
  currency: SupportedCurrencyCode;
  fallbackValue: string;
  rateUpdatedAt?: string;
  status: "converted" | "fallback";
  value: string;
};

export function PipelineCurrencyCard({
  currency,
  fallbackValue,
  rateUpdatedAt,
  status,
  value,
}: PipelineCurrencyCardProps) {
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasCurrencyChange = selectedCurrency !== currency;

  async function savePipelineCurrency() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/pipeline-currency", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currency: selectedCurrency }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          payload?.error?.message ?? "Could not save pipeline currency.",
        );
        return;
      }

      setMessage("Default saved.");
      router.refresh();
    } catch {
      setMessage("Could not save pipeline currency.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-stone-100">
          <TrendingUp className="size-4 text-stone-700" />
        </div>
        <select
          aria-label="Pipeline currency"
          className="h-9 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-100"
          value={selectedCurrency}
          onChange={(event) =>
            setSelectedCurrency(normalizeCurrency(event.target.value))
          }
        >
          {supportedCurrencies.map((candidate) => (
            <option key={candidate.code} value={candidate.code}>
              {candidate.label}
            </option>
          ))}
        </select>
        <Button
          aria-busy={isSaving || undefined}
          aria-label="Save pipeline currency"
          className="size-9 shrink-0"
          disabled={!hasCurrencyChange || isSaving}
          size="icon"
          title="Save pipeline currency"
          type="button"
          variant="secondary"
          onClick={() => void savePipelineCurrency()}
        >
          <Save className="size-4" />
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <p className="text-sm text-stone-500">Pipeline</p>
        <p className="text-xl font-bold text-stone-950">{value}</p>
        {status === "fallback" ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            <RefreshCw className="size-3" />
            Rates unavailable
          </span>
        ) : null}
      </div>
    </div>
  );
}
