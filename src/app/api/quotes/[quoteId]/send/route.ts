import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { sendQuote } from "@/lib/quotes/persistence";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const result = await sendQuote(quoter, quoteId);

  if (!result.ok) {
    const quoteLocked = result.code === "QUOTE_LOCKED";

    return errorResponse(
      result.code,
      result.code === "QUOTE_NOT_FOUND"
        ? "Quote was not found."
        : quoteLocked
          ? "Locked quotes cannot be edited."
          : "The quote must have line items, recipients, and signature fields.",
      result.code === "QUOTE_NOT_FOUND" ? 404 : quoteLocked ? 409 : 422,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_sent",
    properties: {
      quote_id: result.quote.id,
      quote_version: result.version.versionNumber,
      organization_id: quoter.organizationId,
      recipient_count: result.quote.recipients.length,
      line_item_count: result.quote.lineItems.length,
      quote_status: result.quote.status,
    },
  });

  return Response.json({
    quoteId: result.quote.id,
    versionNumber: result.version.versionNumber,
    status: result.quote.status,
    recipients: result.quote.recipients.map((recipient) => ({
      recipientId: recipient.id,
      email: recipient.email,
      status: recipient.status,
      accessToken: recipient.accessToken,
    })),
  });
}
