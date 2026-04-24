import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import {
  deleteQuoteQuoterSignature,
  updateQuoteQuoterSignature,
} from "@/lib/quotes/persistence";
import {
  parseJsonBody,
  quoterSignatureUploadSchema,
} from "@/lib/quotes/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const body = await readJson(request);
  const parsed = parseJsonBody(quoterSignatureUploadSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "QUOTER_SIGNATURE_INVALID",
      "The quoter signature must be a PNG data URL.",
      422,
      parsed.errors,
    );
  }

  const result = await updateQuoteQuoterSignature(quoter, {
    quoteId,
    ...parsed.data,
  });

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "QUOTE_LOCKED"
        ? "Locked quotes cannot be edited."
        : "Quote was not found.",
      result.code === "QUOTE_LOCKED" ? 409 : 404,
    );
  }

  return Response.json({
    status: "updated",
    quoterSignatureAsset: result.quote.quoterSignatureAsset,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const result = await deleteQuoteQuoterSignature(quoter, quoteId);

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "QUOTE_LOCKED"
        ? "Locked quotes cannot be edited."
        : "Quote was not found.",
      result.code === "QUOTE_LOCKED" ? 409 : 404,
    );
  }

  return Response.json({
    status: "deleted",
  });
}
