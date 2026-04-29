import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { deleteQuote, getQuote, updateQuote } from "@/lib/quotes/persistence";
import { parseJsonBody, quoteDraftSchema } from "@/lib/quotes/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const quote = await getQuote(quoter, quoteId);

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

  const result = await updateQuote(quoter, quoteId, parsed.data);

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "QUOTE_LOCKED"
        ? "Locked quotes cannot be edited."
        : "Quote was not found.",
      result.code === "QUOTE_LOCKED" ? 409 : 404,
    );
  }

  const { quote } = result;

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const result = await deleteQuote(quoter, quoteId);

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "QUOTE_NOT_ARCHIVED"
        ? "Only archived quotes can be deleted."
        : "Quote was not found.",
      result.code === "QUOTE_NOT_ARCHIVED" ? 409 : 404,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_deleted",
    properties: {
      quote_id: quoteId,
      organization_id: quoter.organizationId,
    },
  });

  return Response.json({
    deleted: true,
    quoteId,
  });
}
