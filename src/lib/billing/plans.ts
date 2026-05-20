export const workspacePlans = [
  "free_trial",
  "partner_monthly",
  "partner_yearly",
] as const;

export type WorkspacePlan = (typeof workspacePlans)[number];

export type PartnerPackage = {
  plan: Exclude<WorkspacePlan, "free_trial">;
  name: string;
  price?: string;
  description: string;
  features: string[];
};

export type BillingPlanDetails = {
  plan: WorkspacePlan;
  name: string;
  price?: string;
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
    description:
      "For individuals or teams evaluating Remote Quote before upgrading.",
    features: [
      "30-day trial access",
      `Up to ${FREE_TRIAL_LOCKED_QUOTE_LIMIT} locked quotes`,
      `Up to ${FREE_TRIAL_WET_SIGNATURE_PRINT_LIMIT} wet-signature prints`,
      "1 quotation template",
      "1 workspace user",
    ],
  },
  {
    plan: "partner_monthly",
    name: "Solo Partner",
    price: "₱1,499/month",
    description:
      "For individual users who need an unlimited quotation workflow.",
    features: [
      "Unlimited quote creation",
      "Unlimited sending and locking",
      "Unlimited wet-signature printing",
      "1 quotation template",
      "1 workspace user",
      "Email support",
      "Free onboarding training",
    ],
  },
  {
    plan: "partner_yearly",
    name: "Team Partner",
    price: "₱29,990/year",
    description:
      "For sales teams that need shared templates, team visibility, and faster quote management.",
    features: [
      "Everything in Solo Partner",
      "Team dashboard access",
      "Up to 5 team members",
      "Unlimited quotation templates",
      "Reusable quote formats",
      "Team onboarding training",
      "Sales follow-up workflow support",
      "Priority feature request consideration",
    ],
  },
];

export const partnerPackages: PartnerPackage[] = billingPlanDetails.filter(
  (plan): plan is PartnerPackage => plan.plan !== "free_trial",
);

export function planLabel(plan: WorkspacePlan) {
  if (plan === "partner_monthly") {
    return "Solo Partner";
  }

  if (plan === "partner_yearly") {
    return "Team Partner";
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
    ? planBookingLabel(input.targetPlan)
    : "a partner plan";
  const subject = `Book an upgrade call for Remote Quote workspace ${input.workspaceRef}`;
  const packageLines = partnerPackages
    .map(
      (partnerPackage) =>
        `${planBookingLabel(partnerPackage.plan)}: ${partnerPackage.features.join(", ")}`,
    )
    .join("\n");
  const body = [
    "Hello,",
    "",
    `I would like to book an upgrade call for this Remote Quote workspace and discuss ${targetPlanLabel}.`,
    "",
    `Workspace: ${input.workspaceRef}`,
    `Current plan: ${planLabel(input.currentPlan)}`,
    input.targetPlan ? `Requested plan: ${targetPlanLabel}` : null,
    input.requesterEmail ? `Requester email: ${input.requesterEmail}` : null,
    input.requesterUserId ? `Requester user ID: ${input.requesterUserId}` : null,
    "",
    "Available plans:",
    packageLines,
    "",
    "Please share available times for the upgrade call.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `mailto:${encodeURIComponent(UPGRADE_CONTACT_EMAIL)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

function planBookingLabel(plan: WorkspacePlan) {
  const details = billingPlanDetails.find((candidate) => candidate.plan === plan);
  const label = planLabel(plan);

  return details?.price ? `${label} - ${details.price}` : label;
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
