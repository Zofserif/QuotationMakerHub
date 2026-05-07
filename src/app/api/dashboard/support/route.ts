import { z } from "zod";

import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import type { WorkspacePlan } from "@/lib/billing/plans";
import { parseJsonBody } from "@/lib/quotes/validation";

const supportInquirySchema = z.object({
  kind: z.enum(["request", "issue"]),
  message: z.string().trim().min(1).max(4000),
});

type SupportInquiry = z.infer<typeof supportInquirySchema>;

export async function POST(request: Request) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!isPaidPlan(entitlement.plan)) {
    return errorResponse(
      "SUPPORT_PARTNER_REQUIRED",
      "Customer support is available for active partner workspaces.",
      403,
    );
  }

  if (!entitlement.requesterEmail) {
    return errorResponse(
      "SUPPORT_EMAIL_REQUIRED",
      "Could not find an email address for this account.",
      409,
    );
  }

  const topicUrl = process.env.NTFY_SUPPORT_TOPIC_URL?.trim();

  if (!topicUrl || !isValidHttpUrl(topicUrl)) {
    return errorResponse(
      "SUPPORT_TOPIC_NOT_CONFIGURED",
      "Customer support is not configured.",
      503,
    );
  }

  const body = await readJson(request);
  const parsed = parseJsonBody(supportInquirySchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "SUPPORT_INQUIRY_INVALID",
      "Select a type and enter a message.",
      422,
      parsed.errors,
    );
  }

  const notificationTitle = `Remote Quote support ${parsed.data.kind}`;
  const notificationBody = buildNtfyMessage(parsed.data, {
    planLabel: entitlement.planLabel,
    requesterEmail: entitlement.requesterEmail,
    requesterUserId: entitlement.requesterUserId,
    workspaceRef: entitlement.workspaceRef,
  });

  try {
    const response = await fetch(topicUrl, {
      body: notificationBody,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Title: notificationTitle,
      },
      method: "POST",
    });

    if (!response.ok) {
      return errorResponse(
        "SUPPORT_NOTIFICATION_FAILED",
        "Could not send your support message.",
        502,
      );
    }
  } catch {
    return errorResponse(
      "SUPPORT_NOTIFICATION_FAILED",
      "Could not send your support message.",
      502,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "support_inquiry_sent",
    properties: {
      inquiry_type: parsed.data.kind,
      organization_id: quoter.organizationId,
      plan: entitlement.plan,
      workspace_ref: entitlement.workspaceRef,
    },
  });

  return Response.json({ sent: true });
}

function buildNtfyMessage(
  inquiry: SupportInquiry,
  requester: {
    planLabel: string;
    requesterEmail: string;
    requesterUserId: string;
    workspaceRef: string;
  },
) {
  return [
    `Type: ${supportKindLabel(inquiry.kind)}`,
    "",
    "Message:",
    inquiry.message,
    "",
    `Requester email: ${requester.requesterEmail}`,
    `Requester user ID: ${requester.requesterUserId}`,
    `Workspace: ${requester.workspaceRef}`,
    `Plan: ${requester.planLabel}`,
  ].join("\n");
}

function supportKindLabel(kind: SupportInquiry["kind"]) {
  return kind === "request" ? "Request" : "Issue";
}

function isPaidPlan(plan: WorkspacePlan) {
  return plan === "partner_monthly" || plan === "partner_yearly";
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
