import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import { setDefaultQuoteTemplate } from "@/lib/quotes/persistence";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canManageMultipleTemplates) {
    return errorResponse(
      "YEARLY_PLAN_REQUIRED",
      "Unlimited quotation templates are available on the Yearly Partner package.",
      403,
      { entitlement },
    );
  }

  const { templateId } = await params;
  const result = await setDefaultQuoteTemplate(quoter, templateId);

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "TEMPLATE_NOT_FOUND"
        ? "Quote template was not found."
        : "Quote template could not be set as default.",
      result.code === "TEMPLATE_NOT_FOUND" ? 404 : 422,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_template_default_set",
    properties: {
      organization_id: quoter.organizationId,
      template_id: result.template.id,
    },
  });

  return Response.json({ template: result.template });
}
