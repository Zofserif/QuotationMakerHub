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
  workspaceRef: string;
  requesterUserId: string;
  requesterEmail?: string;
  workspaceCreatedAt: string;
  trialEndsAt?: string;
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
      requesterEmail: undefined,
      workspaceCreatedAt: usage.workspaceCreatedAt,
      lockedQuoteCount: usage.lockedQuoteCount,
      wetSignaturePrintCount: usage.wetSignaturePrintCount,
      unrestricted: true,
    });
  }

  const clerk = await clerkClient();
  const { plan, requesterEmail } = await readClerkPlan(clerk, quoter);

  return buildEntitlement({
    plan,
    quoter,
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
  requesterEmail?: string;
  workspaceCreatedAt: string;
  lockedQuoteCount: number;
  wetSignaturePrintCount: number;
  unrestricted: boolean;
}): WorkspaceEntitlement {
  const paid = input.plan === "partner_monthly" || input.plan === "partner_yearly";
  const trialEndsAt = paid
    ? undefined
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
    plan: input.plan,
    planLabel: input.unrestricted ? "Demo account" : planLabel(input.plan),
    workspaceRef: input.quoter.organizationId,
    requesterUserId: input.quoter.clerkUserId,
    requesterEmail: input.requesterEmail,
    workspaceCreatedAt: input.workspaceCreatedAt,
    trialEndsAt,
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
    canManageMultipleTemplates: input.plan === "partner_yearly" || input.unrestricted,
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

      return {
        plan: readPlanFromMetadata(user.privateMetadata),
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
      plan: readPlanFromMetadata(organization.privateMetadata),
      requesterEmail: getPrimaryEmail(user),
    };
  } catch {
    return {
      plan: "free_trial" as WorkspacePlan,
      requesterEmail: undefined,
    };
  }
}

function readPlanFromMetadata(metadata: ClerkMetadata) {
  const remoteQuote =
    metadata && typeof metadata === "object"
      ? metadata.remoteQuote
      : undefined;

  if (!remoteQuote || typeof remoteQuote !== "object") {
    return "free_trial";
  }

  return parseWorkspacePlan(
    (remoteQuote as Record<string, unknown>).plan,
  );
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
