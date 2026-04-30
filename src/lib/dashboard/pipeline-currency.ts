import {
  getCurrencyMinorUnitMultiplier,
  normalizeCurrency,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { formatMoney } from "@/lib/utils";

const exchangeRateApiBaseUrl = "https://open.er-api.com/v6/latest";
const exchangeRateRevalidateSeconds = 60 * 60 * 12;

type PipelineQuote = {
  currency: string;
  totalMinor: number;
};

type ExchangeRateApiPayload = {
  result?: string;
  provider?: string;
  documentation?: string;
  time_last_update_utc?: string;
  base_code?: string;
  rates?: Record<string, number>;
};

export type PipelineCurrencySummary = {
  currency: SupportedCurrencyCode;
  value: string;
  fallbackValue: string;
  status: "converted" | "fallback";
  rateUpdatedAt?: string;
};

export async function resolvePipelineCurrencySummary(
  quotes: PipelineQuote[],
  currency: string,
): Promise<PipelineCurrencySummary> {
  const pipelineCurrency = normalizeCurrency(currency);
  const fallbackValue = formatPipelineValue(quotes);

  if (quotes.length === 0) {
    return {
      currency: pipelineCurrency,
      value: formatMoney(0, pipelineCurrency),
      fallbackValue,
      status: "converted",
    };
  }

  try {
    const conversion = await convertPipelineTotal(quotes, pipelineCurrency);

    return {
      currency: pipelineCurrency,
      value: conversion.value,
      fallbackValue,
      status: "converted",
      rateUpdatedAt: conversion.rateUpdatedAt,
    };
  } catch {
    return {
      currency: pipelineCurrency,
      value: fallbackValue,
      fallbackValue,
      status: "fallback",
    };
  }
}

export function formatPipelineValue(quotes: PipelineQuote[]) {
  const totalsByCurrency = new Map<string, number>();

  for (const quote of quotes) {
    const currency = normalizeCurrency(quote.currency);
    totalsByCurrency.set(
      currency,
      (totalsByCurrency.get(currency) ?? 0) + quote.totalMinor,
    );
  }

  if (totalsByCurrency.size === 0) {
    return formatMoney(0);
  }

  return Array.from(totalsByCurrency.entries())
    .toSorted(([leftCurrency], [rightCurrency]) =>
      leftCurrency.localeCompare(rightCurrency),
    )
    .map(([currency, totalMinor]) => formatMoney(totalMinor, currency))
    .join(" / ");
}

async function convertPipelineTotal(
  quotes: PipelineQuote[],
  targetCurrency: SupportedCurrencyCode,
) {
  const needsRates = quotes.some(
    (quote) => normalizeCurrency(quote.currency) !== targetCurrency,
  );
  const ratesPayload = needsRates
    ? await fetchExchangeRates(targetCurrency)
    : null;
  const rates = ratesPayload?.rates ?? {};
  let targetMajorTotal = 0;

  for (const quote of quotes) {
    const sourceCurrency = normalizeCurrency(quote.currency);
    const sourceMajor =
      quote.totalMinor / getCurrencyMinorUnitMultiplier(sourceCurrency);

    if (sourceCurrency === targetCurrency) {
      targetMajorTotal += sourceMajor;
      continue;
    }

    const targetToSourceRate = rates[sourceCurrency];

    if (!Number.isFinite(targetToSourceRate) || targetToSourceRate <= 0) {
      throw new Error(`Missing ${sourceCurrency} exchange rate.`);
    }

    targetMajorTotal += sourceMajor / targetToSourceRate;
  }

  const targetMinorTotal = Math.round(
    targetMajorTotal * getCurrencyMinorUnitMultiplier(targetCurrency),
  );

  return {
    value: formatMoney(targetMinorTotal, targetCurrency),
    rateUpdatedAt: ratesPayload?.time_last_update_utc,
  };
}

async function fetchExchangeRates(baseCurrency: SupportedCurrencyCode) {
  const response = await fetch(`${exchangeRateApiBaseUrl}/${baseCurrency}`, {
    next: { revalidate: exchangeRateRevalidateSeconds },
  });

  if (!response.ok) {
    throw new Error("Exchange rate request failed.");
  }

  const payload = (await response.json()) as ExchangeRateApiPayload;

  if (
    payload.result !== "success" ||
    payload.base_code !== baseCurrency ||
    !payload.rates
  ) {
    throw new Error("Exchange rate response was invalid.");
  }

  return payload;
}
