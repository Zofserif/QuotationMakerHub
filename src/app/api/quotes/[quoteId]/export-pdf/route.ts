import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { createQuotePdfExport } from "@/lib/quotes/persistence";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const result = await createQuotePdfExport(quoter, quoteId);

  if (!result) {
    return errorResponse("PDF_EXPORT_FAILED", "PDF export could not be created.", 400);
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_pdf_exported",
    properties: {
      quote_id: quoteId,
      quote_version: result.version.versionNumber,
      pdf_sha256: result.sha256,
    },
  });

  return Response.json(result.exportRecord);
}
