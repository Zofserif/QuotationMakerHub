import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { createQuote, listQuotes } from "@/lib/quotes/persistence";
import { parseJsonBody, quoteDraftSchema } from "@/lib/quotes/validation";

export async function GET() {
  const quoter = await requireQuoter();
  return Response.json({ quotes: await listQuotes(quoter) });
}

export async function POST(request: Request) {
  const quoter = await requireQuoter();
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

  const quote = await createQuote(quoter, parsed.data);
  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_created",
    properties: {
      quote_id: quote.id,
      organization_id: quoter.organizationId,
      line_item_count: quote.lineItems.length,
      quote_status: quote.status,
    },
  });

  return Response.json(
    {
      quoteId: quote.id,
      status: quote.status,
    },
    { status: 201 },
  );
}
