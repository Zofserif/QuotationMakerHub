import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import { lockQuote } from "@/lib/quotes/persistence";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canSendQuote) {
    return errorResponse(
      "LOCKED_QUOTE_LIMIT_REACHED",
      "Your free trial has reached the 5 locked quotation limit. Upgrade to a partner package to lock more quotations.",
      403,
      { entitlement },
    );
  }

  const result = await lockQuote(quoter, quoteId);

  if (!result.ok) {
    const quoteNotFound = result.code === "QUOTE_NOT_FOUND";

    return errorResponse(
      result.code,
      quoteNotFound
        ? "Quote was not found."
        : "Only quotes for wet signature can be locked manually.",
      quoteNotFound ? 404 : 409,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_manually_locked",
    properties: {
      quote_id: result.quoteId,
      organization_id: quoter.organizationId,
      changed: result.changed,
      quote_status: result.status,
    },
  });

  return Response.json({
    quoteId: result.quoteId,
    status: result.status,
    lockedAt: result.lockedAt,
    changed: result.changed,
  });
}
