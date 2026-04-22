import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { getDemoClientQuoteView } from "@/lib/demo/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const view = getDemoClientQuoteView(token);

  if (!view) {
    return errorResponse("TOKEN_INVALID", "The signing link is invalid.", 404);
  }

  await captureServerEvent({
    distinctId: view.recipient.id,
    event: "quote_client_link_opened",
    properties: {
      quote_id: view.quoteId,
      quote_version: view.versionNumber,
      quote_status: view.recipient.status,
    },
  });

  return Response.json(view);
}
