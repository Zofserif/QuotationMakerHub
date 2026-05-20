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
  setupSupport?: string[];
  details?: string[];
};

export type BillingPlanDetails = {
  plan: WorkspacePlan;
  name: string;
  price?: string;
  description: string;
  features: string[];
  setupSupport?: string[];
  details?: string[];
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
    price: "Free",
    description:
      "A low-risk way for individuals or teams to test Remote Quote before choosing a partner plan.",
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
      "For individual users who want a faster, more professional quotation workflow and help improving quote-to-close follow-up.",
    features: [
      "Unlimited quote creation",
      "Unlimited sending and locking",
      "Unlimited wet-signature printing",
      "1 quotation template",
      "1 workspace user",
      "Email/chat support",
      "Onboarding training",
      "First quotation template setup assistance",
      "Basic sales process consultation",
      "Quote message templates",
      "Monthly quote process review",
    ],
    details: [
      "Sales quote workflow guide",
      "Quote follow-up script pack",
      "Sales call-to-quote checklist",
      "Price objection response templates",
      "1-2 onboarding/training sessions",
      "14-day post-setup support",
      "Guidance to implement Remote Quote into current sales workflow",
    ],
  },
  {
    plan: "partner_yearly",
    name: "Team Partner",
    price: "₱29,990/year",
    description:
      "For sales teams that need shared standards, team visibility, faster quote management, and a consistent quote-to-close process.",
    features: [
      "Everything in Solo Partner, plus",
      "Team dashboard access",
      "Up to 5 team members",
      "Unlimited quotation templates",
      "Reusable quote formats",
      "Shared product/service line item setup",
      "Team onboarding training",
      "Manager/admin training",
      "1 monthly 30-minute consultation call",
    ],
    details: [
      "Team quotation workflow guide",
      "Team follow-up script pack",
      "Quote ownership and follow-up process setup",
      "Team sales call-to-quote checklist",
      "Standard operating procedure for quoting",
      "Recommendations to improve quote-to-close process",
      "Priority support",
      "Priority feature request consideration",
    ],
  },
];

export const paidPlanSupportDetails = {
  title: "Included with every paid plan",
  description:
    "Remote Quote is more than quotation software. Every paid plan includes implementation support to help you improve your quote-to-close process.",
  items: [
    "Set up your quotation workflow",
    "Create a more professional quote format",
    "Improve customer follow-up",
    "Reduce manual quotation work",
    "Organize your quote process",
    "Use Remote Quote inside your actual sales process",
  ],
};

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

function normalizeExternalUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
}
