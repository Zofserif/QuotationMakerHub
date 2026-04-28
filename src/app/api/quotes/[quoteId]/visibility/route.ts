import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { updateQuoteVisibility } from "@/lib/quotes/persistence";
import {
  parseJsonBody,
  quoteVisibilityUpdateSchema,
} from "@/lib/quotes/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const body = await readJson(request);
  const parsed = parseJsonBody(quoteVisibilityUpdateSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "QUOTE_VISIBILITY_INVALID",
      "The quote visibility must be active, archived, or deleted.",
      422,
      parsed.errors,
    );
  }

  const result = await updateQuoteVisibility(
    quoter,
    quoteId,
    parsed.data.visibility,
  );

  if (!result.ok) {
    return errorResponse("QUOTE_NOT_FOUND", "Quote was not found.", 404);
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_visibility_updated",
    properties: {
      quote_id: result.quote.id,
      organization_id: quoter.organizationId,
      visibility: result.quote.visibility,
      quote_status: result.quote.status,
    },
  });

  return Response.json({
    quoteId: result.quote.id,
    visibility: result.quote.visibility,
  });
}
