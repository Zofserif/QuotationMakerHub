import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { placeSignature } from "@/lib/quotes/persistence";
import { parseJsonBody, signatureUploadSchema } from "@/lib/quotes/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await readJson(request);
  const parsed = parseJsonBody(signatureUploadSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "SIGNATURE_UPLOAD_INVALID",
      "The uploaded signature must be a PNG data URL with a valid field ID.",
      422,
      parsed.errors,
    );
  }

  const result = await placeSignature({
    token,
    ...parsed.data,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    return errorResponse(result.code, "Signature could not be placed.", 400);
  }

  await captureServerEvent({
    distinctId: result.placement.recipientId ?? "client",
    event: "signature_capture_completed",
    properties: {
      quote_id: result.placement.quoteId,
      signature_method: result.asset.sourceMethod,
    },
  });

  return Response.json({
    signatureAssetId: result.asset.id,
    signaturePlacementId: result.placement.id,
    status: "placed",
  });
}
