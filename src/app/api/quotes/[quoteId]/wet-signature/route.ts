import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  markQuoteForWetSignature,
  recordWetSignaturePrint,
} from "@/lib/quotes/persistence";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canPrepareWetSignaturePrint) {
    return errorResponse(
      "WET_SIGNATURE_PRINT_LIMIT_REACHED",
      "Your free trial has reached the 10 wet-signature print limit. Upgrade to a partner package to keep printing.",
      403,
      { entitlement },
    );
  }

  const result = await markQuoteForWetSignature(quoter, quoteId);

  if (!result.ok) {
    const quoteLocked = result.code === "QUOTE_LOCKED";

    return errorResponse(
      result.code,
      quoteLocked
        ? "Locked quotes cannot be marked for wet signature."
        : "Quote was not found.",
      quoteLocked ? 409 : 404,
    );
  }

  await recordWetSignaturePrint(quoter, quoteId);

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_marked_for_wet_signature",
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
    changed: result.changed,
  });
}
