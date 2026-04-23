import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import {
  getQuoteTemplate,
  updateQuoteTemplate,
} from "@/lib/quotes/persistence";
import { mergeQuoteTemplate } from "@/lib/quote-templates/defaults";
import { quoteTemplateSchema } from "@/lib/quote-templates/validation";
import { parseJsonBody } from "@/lib/quotes/validation";

export async function GET() {
  const quoter = await requireQuoter();

  return Response.json({ template: await getQuoteTemplate(quoter) });
}

export async function PUT(request: Request) {
  const quoter = await requireQuoter();
  const body = await readJson(request);
  const parsed = parseJsonBody(quoteTemplateSchema, mergeQuoteTemplate(body));

  if (!parsed.ok) {
    return errorResponse(
      "QUOTE_TEMPLATE_INVALID",
      "The quote template has invalid or missing fields.",
      422,
      parsed.errors,
    );
  }

  const template = await updateQuoteTemplate(quoter, parsed.data);
  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_template_saved",
    properties: {
      organization_id: quoter.organizationId,
      logo_enabled: template.logo.enabled,
      vat_enabled: template.lineItems.vat.enabled,
    },
  });

  return Response.json({ template });
}
