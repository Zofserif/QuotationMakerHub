import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { lineItemDataDraftSchema } from "@/lib/line-item-data/validation";
import {
  createLineItemData,
  listLineItemData,
} from "@/lib/quotes/persistence";
import { parseJsonBody } from "@/lib/quotes/validation";

export async function GET() {
  const quoter = await requireQuoter();

  return Response.json({ lineItemData: await listLineItemData(quoter) });
}

export async function POST(request: Request) {
  const quoter = await requireQuoter();
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

  const lineItemData = await createLineItemData(quoter, parsed.data);
  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "line_item_data_created",
    properties: {
      organization_id: quoter.organizationId,
      line_item_data_id: lineItemData.id,
      has_image: Boolean(lineItemData.descriptionImageStoragePath),
    },
  });

  return Response.json({ lineItemData }, { status: 201 });
}
