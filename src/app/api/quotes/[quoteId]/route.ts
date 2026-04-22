import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getDemoQuote, updateDemoQuote } from "@/lib/demo/store";
import { parseJsonBody, quoteDraftSchema } from "@/lib/quotes/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  await requireQuoter();
  const { quoteId } = await params;
  const quote = getDemoQuote(quoteId);

  if (!quote) {
    return errorResponse("QUOTE_NOT_FOUND", "Quote was not found.", 404);
  }

  return Response.json(quote);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const body = await readJson(request);
  const parsed = parseJsonBody(quoteDraftSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "QUOTE_DRAFT_INVALID",
      "The quote draft has invalid or missing fields.",
      422,
      parsed.errors,
    );
  }

  const quote = updateDemoQuote(quoteId, parsed.data);

  if (!quote) {
    return errorResponse("QUOTE_NOT_FOUND", "Quote was not found.", 404);
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_draft_saved",
    properties: {
      quote_id: quote.id,
      organization_id: quoter.organizationId,
      line_item_count: quote.lineItems.length,
      quote_status: quote.status,
    },
  });

  return Response.json({
    quoteId: quote.id,
    status: quote.status,
    subtotalMinor: quote.subtotalMinor,
    taxMinor: quote.taxMinor,
    totalMinor: quote.totalMinor,
  });
}
