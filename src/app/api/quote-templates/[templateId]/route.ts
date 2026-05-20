import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  deleteQuoteTemplateRecord,
  updateQuoteTemplateRecord,
} from "@/lib/quotes/persistence";
import { mergeQuoteTemplate } from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import { quoteTemplateSchema } from "@/lib/quote-templates/validation";
import { parseJsonBody } from "@/lib/quotes/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canManageMultipleTemplates) {
    return yearlyPlanRequired(entitlement);
  }

  const { templateId } = await params;
  const body = (await readJson(request)) as {
    name?: unknown;
    content?: unknown;
  } | null;
  const content =
    body && "content" in body
      ? parseTemplate(body.content)
      : { ok: true as const, data: undefined };

  if (!content.ok) {
    return content.response;
  }

  const result = await updateQuoteTemplateRecord(quoter, templateId, {
    name: typeof body?.name === "string" ? body.name : undefined,
    content: content.data,
  });

  if (!result.ok) {
    return templateMutationError(result.code);
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_template_updated",
    properties: {
      organization_id: quoter.organizationId,
      template_id: result.template.id,
    },
  });

  return Response.json({ template: result.template });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canManageMultipleTemplates) {
    return yearlyPlanRequired(entitlement);
  }

  const { templateId } = await params;
  const result = await deleteQuoteTemplateRecord(quoter, templateId);

  if (!result.ok) {
    return templateMutationError(result.code);
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_template_deleted",
    properties: {
      organization_id: quoter.organizationId,
      template_id: result.template.id,
    },
  });

  return Response.json({ templateId: result.template.id });
}

function parseTemplate(value: unknown) {
  if (!isQuoteTemplatePatch(value)) {
    return {
      ok: false as const,
      response: errorResponse(
        "QUOTE_TEMPLATE_INVALID",
        "The quote template has invalid or missing fields.",
        422,
      ),
    };
  }

  const mergedTemplate = mergeQuoteTemplate(value);
  const parsed = parseJsonBody(quoteTemplateSchema, {
    ...mergedTemplate,
    lineItems: {
      ...mergedTemplate.lineItems,
      vat: {
        ...mergedTemplate.lineItems.vat,
        enabled: true,
      },
    },
  });

  if (!parsed.ok) {
    return {
      ok: false as const,
      response: errorResponse(
        "QUOTE_TEMPLATE_INVALID",
        "The quote template has invalid or missing fields.",
        422,
        parsed.errors,
      ),
    };
  }

  return { ok: true as const, data: parsed.data };
}

function isQuoteTemplatePatch(value: unknown): value is Partial<QuoteTemplate> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function templateMutationError(code: string) {
  if (code === "TEMPLATE_NOT_FOUND") {
    return errorResponse(code, "Quote template was not found.", 404);
  }

  if (code === "TEMPLATE_DELETE_DEFAULT") {
    return errorResponse(code, "The default quote template cannot be deleted.", 409);
  }

  return errorResponse(code, "Template name is required.", 422);
}

function yearlyPlanRequired(entitlement: unknown) {
  return errorResponse(
    "YEARLY_PLAN_REQUIRED",
    "Unlimited quotation templates are available on the Team Partner plan.",
    403,
    { entitlement },
  );
}
