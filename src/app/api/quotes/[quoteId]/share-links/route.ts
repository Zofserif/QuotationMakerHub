import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { rotateQuoteShareLinks } from "@/lib/quotes/persistence";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const result = await rotateQuoteShareLinks(quoter, quoteId);

  if (!result.ok) {
    const quoteLocked = result.code === "QUOTE_LOCKED";
    const quoteNotFound = result.code === "QUOTE_NOT_FOUND";

    return errorResponse(
      result.code,
      quoteNotFound
        ? "Quote was not found."
        : quoteLocked
          ? "Locked quotes cannot be edited."
          : "Send this quote before generating a share link.",
      quoteNotFound ? 404 : quoteLocked ? 409 : 422,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_share_links_rotated",
    properties: {
      quote_id: result.quote.id,
      organization_id: quoter.organizationId,
      recipient_count: result.shareLinks.length,
      quote_status: result.quote.status,
    },
  });

  return Response.json({
    quoteId: result.quote.id,
    status: result.quote.status,
    shareLinks: result.shareLinks,
  });
}
