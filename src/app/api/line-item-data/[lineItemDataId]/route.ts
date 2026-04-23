import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { lineItemDataDraftSchema } from "@/lib/line-item-data/validation";
import {
  deleteLineItemData,
  updateLineItemData,
} from "@/lib/quotes/persistence";
import { parseJsonBody } from "@/lib/quotes/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ lineItemDataId: string }> },
) {
  const quoter = await requireQuoter();
  const { lineItemDataId } = await params;
  const body = await readJson(request);
  const parsed = parseJsonBody(lineItemDataDraftSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "LINE_ITEM_DATA_INVALID",
      "The line item data has invalid or missing fields.",
      422,
      parsed.errors,
    );
  }

  const lineItemData = await updateLineItemData(
    quoter,
    lineItemDataId,
    parsed.data,
  );

  if (!lineItemData) {
    return errorResponse(
      "LINE_ITEM_DATA_NOT_FOUND",
      "Line item data was not found.",
      404,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "line_item_data_updated",
    properties: {
      organization_id: quoter.organizationId,
      line_item_data_id: lineItemData.id,
      has_image: Boolean(lineItemData.descriptionImageStoragePath),
    },
  });

  return Response.json({ lineItemData });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ lineItemDataId: string }> },
) {
  const quoter = await requireQuoter();
  const { lineItemDataId } = await params;
  const deleted = await deleteLineItemData(quoter, lineItemDataId);

  if (!deleted) {
    return errorResponse(
      "LINE_ITEM_DATA_NOT_FOUND",
      "Line item data was not found.",
      404,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "line_item_data_deleted",
    properties: {
      organization_id: quoter.organizationId,
      line_item_data_id: lineItemDataId,
    },
  });

  return Response.json({ deleted: true });
}
