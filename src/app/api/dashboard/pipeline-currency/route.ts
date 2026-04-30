import { z } from "zod";

import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { normalizeCurrency, supportedCurrencyCodes } from "@/lib/currency";
import { updatePipelineCurrency } from "@/lib/quotes/persistence";
import { parseJsonBody } from "@/lib/quotes/validation";

const pipelineCurrencySchema = z.object({
  currency: z
    .string()
    .transform((currency) => normalizeCurrency(currency))
    .pipe(z.enum(supportedCurrencyCodes)),
});

export async function PUT(request: Request) {
  const quoter = await requireQuoter();
  const body = await readJson(request);
  const parsed = parseJsonBody(pipelineCurrencySchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "PIPELINE_CURRENCY_INVALID",
      "Select a supported pipeline currency.",
      422,
      parsed.errors,
    );
  }

  let currency: string;

  try {
    currency = await updatePipelineCurrency(quoter, parsed.data.currency);
  } catch {
    return errorResponse(
      "PIPELINE_CURRENCY_SAVE_FAILED",
      "Could not save pipeline currency. Make sure database migrations are applied.",
      500,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "pipeline_currency_saved",
    properties: {
      organization_id: quoter.organizationId,
      currency,
    },
  });

  return Response.json({ currency });
}
