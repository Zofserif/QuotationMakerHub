import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { rejectQuote } from "@/lib/quotes/persistence";
import { parseJsonBody, rejectQuoteSchema } from "@/lib/quotes/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await readJson(request);
  const parsed = parseJsonBody(rejectQuoteSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "REJECTION_COMMENT_REQUIRED",
      "Enter what needs to be changed before rejecting the quotation.",
      422,
      parsed.errors,
    );
  }

  const result = await rejectQuote({
    token,
    comment: parsed.data.comment,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "RECIPIENT_LOCKED"
        ? "This quotation can no longer be rejected."
        : "The quotation could not be rejected.",
      400,
    );
  }

  await captureServerEvent({
    distinctId: result.recipient.id,
    event: "quote_client_rejected",
    properties: {
      quote_id: result.quote.id,
      quote_status: result.quote.status,
    },
  });

  return Response.json({
    quoteId: result.quote.id,
    recipientStatus: result.recipient.status,
    quoteStatus: result.quote.status,
    rejectedAt: result.rejectedAt,
    rejectionComment: result.rejectionComment,
  });
}
