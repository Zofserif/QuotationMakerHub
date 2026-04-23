import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import {
  isLineItemImageMimeType,
  lineItemImageMaxBytes,
} from "@/lib/line-item-data/validation";
import { uploadLineItemDataImage } from "@/lib/quotes/persistence";

export async function POST(request: Request) {
  const quoter = await requireQuoter();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return errorResponse(
      "LINE_ITEM_IMAGE_INVALID",
      "Upload a PNG, JPEG, or WEBP image file.",
      422,
    );
  }

  if (!isLineItemImageMimeType(file.type)) {
    return errorResponse(
      "LINE_ITEM_IMAGE_INVALID",
      "Description picture must be a PNG, JPEG, or WEBP image.",
      422,
    );
  }

  if (file.size > lineItemImageMaxBytes) {
    return errorResponse(
      "LINE_ITEM_IMAGE_TOO_LARGE",
      "Description picture must be 2 MB or smaller.",
      413,
    );
  }

  const upload = await uploadLineItemDataImage(quoter, file);

  return Response.json({ upload }, { status: 201 });
}
