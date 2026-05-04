import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { lineItemDataBulkDraftSchema } from "@/lib/line-item-data/validation";
import { createLineItemDataBatch } from "@/lib/quotes/persistence";
import { parseJsonBody } from "@/lib/quotes/validation";

export async function POST(request: Request) {
  const quoter = await requireQuoter();
  const body = await readJson(request);
  const parsed = parseJsonBody(lineItemDataBulkDraftSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "LINE_ITEM_DATA_BULK_INVALID",
      "The line item data CSV has invalid or missing fields.",
      422,
      parsed.errors,
    );
  }

  const lineItemData = await createLineItemDataBatch(quoter, parsed.data.items);
  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "line_item_data_bulk_created",
    properties: {
      organization_id: quoter.organizationId,
      row_count: lineItemData.length,
    },
  });

  return Response.json({ lineItemData }, { status: 201 });
}
