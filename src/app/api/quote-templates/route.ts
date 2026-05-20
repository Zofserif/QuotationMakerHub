import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  createQuoteTemplate,
  listQuoteTemplates,
} from "@/lib/quotes/persistence";
import { mergeQuoteTemplate } from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import { quoteTemplateSchema } from "@/lib/quote-templates/validation";
import { parseJsonBody } from "@/lib/quotes/validation";

export async function GET() {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);
  const templates = await listQuoteTemplates(quoter);

  return Response.json({
    templates: entitlement.canManageMultipleTemplates
      ? templates
      : templates.filter((template) => template.isDefault).slice(0, 1),
    entitlement,
  });
}

export async function POST(request: Request) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.canManageMultipleTemplates) {
    return yearlyPlanRequired(entitlement);
  }

  const body = (await readJson(request)) as {
    name?: unknown;
    content?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name : "";
  const content =
    body && "content" in body
      ? parseTemplate(body.content)
      : { ok: true as const, data: undefined };

  if (!content.ok) {
    return content.response;
  }

  const result = await createQuoteTemplate(quoter, {
    name,
    content: content.data,
  });

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.code === "TEMPLATE_NAME_REQUIRED"
        ? "Template name is required."
        : "Quote template could not be created.",
      422,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "quote_template_created",
    properties: {
      organization_id: quoter.organizationId,
      template_id: result.template.id,
    },
  });

  return Response.json({ template: result.template }, { status: 201 });
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

function yearlyPlanRequired(entitlement: unknown) {
  return errorResponse(
    "YEARLY_PLAN_REQUIRED",
    "Unlimited quotation templates are available on the Team Partner plan.",
    403,
    { entitlement },
  );
}
