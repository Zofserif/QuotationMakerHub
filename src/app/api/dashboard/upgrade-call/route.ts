import { z } from "zod";

import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { errorResponse, readJson } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  billingPlanDetails,
  planLabel,
  type WorkspacePlan,
} from "@/lib/billing/plans";
import { parseJsonBody } from "@/lib/quotes/validation";

const upgradeCallRequestSchema = z.object({
  targetPlan: z.enum(["partner_monthly", "partner_yearly"]),
  contactNumber: z.string().trim().max(80).optional().or(z.literal("")),
  comment: z.string().trim().min(1).max(4000),
});

type UpgradeCallRequest = z.infer<typeof upgradeCallRequestSchema>;

export async function POST(request: Request) {
  const quoter = await requireQuoter();
  const entitlement = await getWorkspaceEntitlement(quoter);

  if (!entitlement.requesterEmail) {
    return errorResponse(
      "UPGRADE_CALL_EMAIL_REQUIRED",
      "Could not find an email address for this account.",
      409,
    );
  }

  const topicUrl = process.env.NTFY_SUPPORT_TOPIC_URL?.trim();

  if (!topicUrl || !isValidHttpUrl(topicUrl)) {
    return errorResponse(
      "UPGRADE_CALL_TOPIC_NOT_CONFIGURED",
      "Upgrade call requests are not configured.",
      503,
    );
  }

  const body = await readJson(request);
  const parsed = parseJsonBody(upgradeCallRequestSchema, body);

  if (!parsed.ok) {
    return errorResponse(
      "UPGRADE_CALL_REQUEST_INVALID",
      "Select an upgrade plan and enter a comment.",
      422,
      parsed.errors,
    );
  }

  if (!isValidUpgradePath(entitlement.plan, parsed.data.targetPlan)) {
    return errorResponse(
      "UPGRADE_CALL_TARGET_INVALID",
      "Select an available upgrade plan for this workspace.",
      422,
    );
  }

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
        Title: "Remote Quote upgrade call request",
      },
      method: "POST",
    });

    if (!response.ok) {
      return errorResponse(
        "UPGRADE_CALL_NOTIFICATION_FAILED",
        "Could not send your upgrade call request.",
        502,
      );
    }
  } catch {
    return errorResponse(
      "UPGRADE_CALL_NOTIFICATION_FAILED",
      "Could not send your upgrade call request.",
      502,
    );
  }

  await captureServerEvent({
    distinctId: quoter.clerkUserId,
    event: "upgrade_call_requested",
    properties: {
      contact_number_provided: Boolean(parsed.data.contactNumber),
      current_plan: entitlement.plan,
      organization_id: quoter.organizationId,
      target_plan: parsed.data.targetPlan,
      workspace_ref: entitlement.workspaceRef,
    },
  });

  return Response.json({ sent: true });
}

function buildNtfyMessage(
  inquiry: UpgradeCallRequest,
  requester: {
    planLabel: string;
    requesterEmail: string;
    requesterUserId: string;
    workspaceRef: string;
  },
) {
  return [
    "Type: Upgrade call request",
    "",
    "Comment:",
    inquiry.comment,
    "",
    inquiry.contactNumber ? `Contact number: ${inquiry.contactNumber}` : null,
    `Requester email: ${requester.requesterEmail}`,
    `Requester user ID: ${requester.requesterUserId}`,
    `Workspace: ${requester.workspaceRef}`,
    `Current plan: ${requester.planLabel}`,
    `Requested plan: ${upgradePlanLabel(inquiry.targetPlan)}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function upgradePlanLabel(plan: UpgradeCallRequest["targetPlan"]) {
  const details = billingPlanDetails.find((candidate) => candidate.plan === plan);
  const label = planLabel(plan);

  return details?.price ? `${label} - ${details.price}` : label;
}

function isValidUpgradePath(
  currentPlan: WorkspacePlan,
  targetPlan: UpgradeCallRequest["targetPlan"],
) {
  if (currentPlan === "free_trial") {
    return targetPlan === "partner_monthly" || targetPlan === "partner_yearly";
  }

  return currentPlan === "partner_monthly" && targetPlan === "partner_yearly";
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
