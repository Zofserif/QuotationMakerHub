import { clerkClient } from "@clerk/nextjs/server";

import { isClerkConfigured } from "@/lib/auth/clerk";
import {
  FREE_TRIAL_DURATION_MONTHS,
  FREE_TRIAL_LOCKED_QUOTE_LIMIT,
  FREE_TRIAL_WET_SIGNATURE_PRINT_LIMIT,
  parseWorkspacePlan,
  planLabel,
  type WorkspacePlan,
} from "@/lib/billing/plans";
import {
  getWorkspaceUsage,
  usesDemoPersistence,
  type QuoterContext,
} from "@/lib/quotes/persistence";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type WorkspaceEntitlement = {
  plan: WorkspacePlan;
  planLabel: string;
  expiredPaidPlanLabel?: string;
  workspaceRef: string;
  requesterUserId: string;
  requesterEmail?: string;
  workspaceCreatedAt: string;
  paidPlanExpiredAt?: string;
  trialEndsAt?: string;
  renewsAt?: string;
  usage: {
    lockedQuoteCount: number;
    wetSignaturePrintCount: number;
  };
  limits: {
    lockedQuoteLimit?: number;
    wetSignaturePrintLimit?: number;
  };
  remaining: {
    lockedQuotes?: number;
    wetSignaturePrints?: number;
  };
  canCreateQuote: boolean;
  canSendQuote: boolean;
  canPrepareWetSignaturePrint: boolean;
  canManageMultipleTemplates: boolean;
  unrestricted: boolean;
};

export async function getWorkspaceEntitlement(
  quoter: QuoterContext,
): Promise<WorkspaceEntitlement> {
  const usage = await getWorkspaceUsage(quoter);

  if (usesDemoPersistence() || !isClerkConfigured()) {
    return buildEntitlement({
      plan: "partner_yearly",
      quoter,
      renewsAt: undefined,
      requesterEmail: undefined,
      workspaceCreatedAt: usage.workspaceCreatedAt,
      lockedQuoteCount: usage.lockedQuoteCount,
      wetSignaturePrintCount: usage.wetSignaturePrintCount,
      unrestricted: true,
    });
  }

  const clerk = await clerkClient();
  const { plan, renewsAt, requesterEmail } = await readClerkPlan(clerk, quoter);

  return buildEntitlement({
    plan,
    quoter,
    renewsAt,
    requesterEmail,
    workspaceCreatedAt: usage.workspaceCreatedAt,
    lockedQuoteCount: usage.lockedQuoteCount,
    wetSignaturePrintCount: usage.wetSignaturePrintCount,
    unrestricted: false,
  });
}

function buildEntitlement(input: {
  plan: WorkspacePlan;
  quoter: QuoterContext;
  renewsAt?: string;
  requesterEmail?: string;
  workspaceCreatedAt: string;
  lockedQuoteCount: number;
  wetSignaturePrintCount: number;
  unrestricted: boolean;
}): WorkspaceEntitlement {
  const renewalExpired =
    isPaidPlan(input.plan) &&
    Boolean(input.renewsAt) &&
    !isNowBeforeOrEqual(input.renewsAt);
  const effectivePlan: WorkspacePlan = renewalExpired
    ? "free_trial"
    : input.plan;
  const paid = isPaidPlan(effectivePlan);
  const trialEndsAt = paid
    ? undefined
    : renewalExpired && input.renewsAt
      ? input.renewsAt
      : addMonths(
          new Date(input.workspaceCreatedAt),
          FREE_TRIAL_DURATION_MONTHS,
        ).toISOString();
  const trialActive = paid || input.unrestricted || isNowBeforeOrEqual(trialEndsAt);
  const canSendQuote =
    paid ||
    input.unrestricted ||
    input.lockedQuoteCount < FREE_TRIAL_LOCKED_QUOTE_LIMIT;
  const canPrepareWetSignaturePrint =
    paid ||
    input.unrestricted ||
    input.wetSignaturePrintCount < FREE_TRIAL_WET_SIGNATURE_PRINT_LIMIT;

  return {
    plan: effectivePlan,
    planLabel: input.unrestricted ? "Demo account" : planLabel(effectivePlan),
    expiredPaidPlanLabel: renewalExpired ? planLabel(input.plan) : undefined,
    workspaceRef: input.quoter.organizationId,
    requesterUserId: input.quoter.clerkUserId,
    requesterEmail: input.requesterEmail,
    workspaceCreatedAt: input.workspaceCreatedAt,
    paidPlanExpiredAt: renewalExpired ? input.renewsAt : undefined,
    trialEndsAt,
    renewsAt: paid ? input.renewsAt : undefined,
    usage: {
      lockedQuoteCount: input.lockedQuoteCount,
      wetSignaturePrintCount: input.wetSignaturePrintCount,
    },
    limits: paid
      ? {}
      : {
          lockedQuoteLimit: FREE_TRIAL_LOCKED_QUOTE_LIMIT,
          wetSignaturePrintLimit: FREE_TRIAL_WET_SIGNATURE_PRINT_LIMIT,
        },
    remaining: paid
      ? {}
      : {
          lockedQuotes: Math.max(
            0,
            FREE_TRIAL_LOCKED_QUOTE_LIMIT - input.lockedQuoteCount,
          ),
          wetSignaturePrints: Math.max(
            0,
            FREE_TRIAL_WET_SIGNATURE_PRINT_LIMIT -
              input.wetSignaturePrintCount,
          ),
        },
    canCreateQuote: paid || input.unrestricted || trialActive,
    canSendQuote,
    canPrepareWetSignaturePrint,
    canManageMultipleTemplates: effectivePlan === "partner_yearly" || input.unrestricted,
    unrestricted: input.unrestricted || paid,
  };
}

async function readClerkPlan(
  clerk: Awaited<ReturnType<typeof clerkClient>>,
  quoter: QuoterContext,
) {
  try {
    const userPromise = clerk.users.getUser(quoter.clerkUserId);

    if (quoter.organizationId.startsWith("personal:")) {
      const user = await userPromise;
      const { plan, renewsAt } = readRemoteQuoteMetadata(user.privateMetadata);

      return {
        plan,
        renewsAt,
        requesterEmail: getPrimaryEmail(user),
      };
    }

    const [organization, user] = await Promise.all([
      clerk.organizations.getOrganization({
        organizationId: quoter.organizationId,
      }),
      userPromise,
    ]);

    return {
      ...readRemoteQuoteMetadata(organization.privateMetadata),
      requesterEmail: getPrimaryEmail(user),
    };
  } catch {
    return {
      plan: "free_trial" as WorkspacePlan,
      renewsAt: undefined,
      requesterEmail: undefined,
    };
  }
}

function readRemoteQuoteMetadata(metadata: ClerkMetadata) {
  const remoteQuote =
    metadata && typeof metadata === "object"
      ? metadata.remoteQuote
      : undefined;

  if (!remoteQuote || typeof remoteQuote !== "object") {
    return {
      plan: "free_trial" as WorkspacePlan,
      renewsAt: undefined,
    };
  }

  const remoteQuoteRecord = remoteQuote as Record<string, unknown>;

  return {
    plan: parseWorkspacePlan(remoteQuoteRecord.plan),
    renewsAt: parseIsoDate(remoteQuoteRecord.renewsAt),
  };
}

function getPrimaryEmail(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
}) {
  return (
    user.emailAddresses?.find(
      (email) => email.id === user.primaryEmailAddressId,
    )?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress
  );
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function parseIsoDate(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isPaidPlan(plan: WorkspacePlan) {
  return plan === "partner_monthly" || plan === "partner_yearly";
}

function isNowBeforeOrEqual(value?: string) {
  if (!value) {
    return true;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() <= date.getTime();
}
