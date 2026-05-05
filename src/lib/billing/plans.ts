export const workspacePlans = [
  "free_trial",
  "partner_monthly",
  "partner_yearly",
] as const;

export type WorkspacePlan = (typeof workspacePlans)[number];

export type PartnerPackage = {
  plan: Exclude<WorkspacePlan, "free_trial">;
  name: string;
  description: string;
  features: string[];
};

export type BillingPlanDetails = {
  plan: WorkspacePlan;
  name: string;
  description: string;
  features: string[];
};

export const FREE_TRIAL_LOCKED_QUOTE_LIMIT = 5;

export const FREE_TRIAL_WET_SIGNATURE_PRINT_LIMIT = 10;

export const FREE_TRIAL_DURATION_MONTHS = 1;

export const UPGRADE_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_UPGRADE_CONTACT_EMAIL ?? "";

export const COFFEE_DONATION_URL = normalizeExternalUrl(
  process.env.NEXT_PUBLIC_COFFEE_DONATION_URL ?? "",
);

export const billingPlanDetails: BillingPlanDetails[] = [
  {
    plan: "free_trial",
    name: "Free Trial",
    description: "For evaluating Remote Quote with starter workspace limits.",
    features: [
      `${FREE_TRIAL_DURATION_MONTHS} month trial access`,
      `${FREE_TRIAL_LOCKED_QUOTE_LIMIT} locked or sent quotations`,
      `${FREE_TRIAL_WET_SIGNATURE_PRINT_LIMIT} wet-signature prints`,
      "One quotation template",
    ],
  },
  {
    plan: "partner_monthly",
    name: "Monthly Partner",
    description: "For active teams that need unlimited quotation workflow.",
    features: [
      "Unlimited quotation creation",
      "Unlimited sending and locking",
      "Unlimited wet-signature printing",
      "One quotation template",
    ],
  },
  {
    plan: "partner_yearly",
    name: "Yearly Partner",
    description: "For teams that want template libraries and partner access.",
    features: [
      "Everything in Monthly Partner",
      "Unlimited quotation templates",
      "Reusable templates for different quote formats",
      "Best fit for long-term partner workspaces",
    ],
  },
];

export const partnerPackages: PartnerPackage[] = billingPlanDetails.filter(
  (plan): plan is PartnerPackage => plan.plan !== "free_trial",
);

export function planLabel(plan: WorkspacePlan) {
  if (plan === "partner_monthly") {
    return "Monthly Partner";
  }

  if (plan === "partner_yearly") {
    return "Yearly Partner";
  }

  return "Free Trial";
}

export function parseWorkspacePlan(value: unknown): WorkspacePlan {
  return workspacePlans.includes(value as WorkspacePlan)
    ? (value as WorkspacePlan)
    : "free_trial";
}

export function buildUpgradeMailto(input: {
  workspaceRef: string;
  requesterEmail?: string;
  requesterUserId?: string;
  currentPlan: WorkspacePlan;
  targetPlan?: WorkspacePlan;
}) {
  if (!UPGRADE_CONTACT_EMAIL) {
    return null;
  }

  const targetPlanLabel = input.targetPlan
    ? planLabel(input.targetPlan)
    : "a partner package";
  const subject = `Upgrade Remote Quote workspace ${input.workspaceRef}`;
  const packageLines = partnerPackages
    .map(
      (partnerPackage) =>
        `${partnerPackage.name}: ${partnerPackage.features.join(", ")}`,
    )
    .join("\n");
  const body = [
    "Hello,",
    "",
    `I would like to upgrade this Remote Quote workspace to ${targetPlanLabel}.`,
    "",
    `Workspace: ${input.workspaceRef}`,
    `Current plan: ${planLabel(input.currentPlan)}`,
    input.targetPlan ? `Requested plan: ${planLabel(input.targetPlan)}` : null,
    input.requesterEmail ? `Requester email: ${input.requesterEmail}` : null,
    input.requesterUserId ? `Requester user ID: ${input.requesterUserId}` : null,
    "",
    "Available packages:",
    packageLines,
    "",
    "Please send the payment method and package details.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `mailto:${encodeURIComponent(UPGRADE_CONTACT_EMAIL)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

function normalizeExternalUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
}
