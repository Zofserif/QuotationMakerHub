import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { createDemoPdfExport, getDemoQuoteVersions } from "@/lib/demo/store";
import { renderQuotePdf } from "@/lib/pdf/render-pdf";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const quoter = await requireQuoter();
  const { quoteId } = await params;
  const exportRecord = createDemoPdfExport(quoteId);
  const version = getDemoQuoteVersions(quoteId).at(-1);

  if (!exportRecord || !version) {
    return errorResponse("PDF_EXPORT_FAILED", "PDF export could not be created.", 400);
  }

  const rendered = await renderQuotePdf({
    quoteId,
    quoteVersionId: version.id,
    requestedByClerkUserId: quoter.clerkUserId,
  });

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_pdf_exported",
    properties: {
      quote_id: quoteId,
      quote_version: version.versionNumber,
      pdf_sha256: rendered.sha256,
    },
  });

  return Response.json(exportRecord);
}
