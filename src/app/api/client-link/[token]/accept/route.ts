import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { acceptDemoQuote } from "@/lib/demo/store";
import { acceptQuoteSchema, parseJsonBody } from "@/lib/quotes/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await readJson(request);
  const parsed = parseJsonBody(acceptQuoteSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "SIGNATURE_REQUIRED",
      "Typed name and confirmation are required before acceptance.",
      422,
      parsed.errors,
    );
  }

  const result = acceptDemoQuote({
    token,
    typedName: parsed.data.typedName,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "SIGNATURE_REQUIRED"
        ? "All required signature fields must be completed first."
        : "The quote could not be accepted.",
      400,
    );
  }

  await captureServerEvent({
    distinctId: result.recipient.id,
    event: "quote_client_accepted",
    properties: {
      quote_id: result.quote.id,
      quote_status: result.quote.status,
    },
  });

  return Response.json({
    quoteId: result.quote.id,
    recipientStatus: result.recipient.status,
    quoteStatus: result.quote.status,
    locked: result.locked,
    acceptedAt: result.acceptedAt,
  });
}
