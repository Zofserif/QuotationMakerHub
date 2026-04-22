import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { createDemoQuote, listDemoQuotes } from "@/lib/demo/store";
import { parseJsonBody, quoteDraftSchema } from "@/lib/quotes/validation";

export async function GET() {
  await requireQuoter();
  return Response.json({ quotes: listDemoQuotes() });
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

  const quote = createDemoQuote(parsed.data);
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
