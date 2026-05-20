export type LandingPageNiche = {
  slug: string;
  label: string;
  image?: {
    src: string;
    alt?: string;
  };
  eyebrow: string;
  metadataTitle: string;
  metadataDescription: string;
  introTitle: string;
  intro: string;
  painPoints: string[];
  workflowBenefits: string[];
  exampleQuoteItems: string[];
  ctaText: string;
};

export const nicheLandingPages = [
  {
    slug: "cctv-security-quotes",
    label: "CCTV and security services",
    eyebrow: "Built for CCTV installers and security teams",
    metadataTitle: "CCTV and Security Quote Software | Remote Quote",
    metadataDescription:
      "Create CCTV, alarm, access control, and security service quotes faster with client-ready approvals and real-time signatures.",
    introTitle: "Send security proposals that are clear enough to approve today.",
    intro:
      "Security clients compare camera counts, coverage zones, cabling, monitoring, and maintenance. Remote Quote helps you turn that scope into a clean quotation your client can review, sign, and move forward with before the job goes cold.",
    painPoints: [
      "Clients ask for changes after seeing camera locations, storage days, or monitoring options.",
      "Install quotes get delayed while labor, equipment, and add-ons are rewritten manually.",
      "Approval gets stuck because the client cannot sign while the need is still urgent.",
    ],
    workflowBenefits: [
      "Break down equipment, installation, monitoring, maintenance, and optional upgrades clearly.",
      "Send a client-ready quote link after the site visit or consultation.",
      "Capture a real-time signature while the security risk is still top of mind.",
    ],
    exampleQuoteItems: [
      "Indoor and outdoor IP cameras",
      "NVR, storage, and remote viewing setup",
      "Structured cabling and conduit work",
      "Alarm, access control, and monitoring add-ons",
    ],
    ctaText: "Create a security quote now",
  },
  {
    slug: "it-solutions-repair-quotes",
    label: "IT solutions and repairs",
    eyebrow: "Built for IT support, repairs, and managed services",
    metadataTitle: "IT Solutions and Repair Quote Software | Remote Quote",
    metadataDescription:
      "Create IT repair, hardware, network, software, and support quotes faster with client-ready approvals and real-time signatures.",
    introTitle: "Turn technical scope into a quote clients can understand.",
    intro:
      "IT work often mixes diagnostics, parts, licensing, labor, and support terms. Remote Quote helps you package the recommendation clearly so clients can approve the fix, upgrade, or service plan without long email threads.",
    painPoints: [
      "Clients hesitate when technical recommendations are buried in a plain message.",
      "Parts, labor, subscriptions, and service levels change from job to job.",
      "Approval slows down when the client has to print, reply, or manually confirm.",
    ],
    workflowBenefits: [
      "Separate diagnostics, hardware, software, labor, and ongoing support in one quote.",
      "Present repair and upgrade options without losing the client in technical detail.",
      "Get signed approval before ordering parts or reserving technician time.",
    ],
    exampleQuoteItems: [
      "Laptop, desktop, and server repair",
      "Network setup, Wi-Fi, and firewall configuration",
      "Software licenses and subscription setup",
      "Managed support retainers and maintenance visits",
    ],
    ctaText: "Create an IT quote now",
  },
  {
    slug: "hvac-electrical-repair-quotes",
    label: "HVAC and electrical solutions and repairs",
    eyebrow: "Built for HVAC, electrical, and repair contractors",
    metadataTitle: "HVAC and Electrical Quote Software | Remote Quote",
    metadataDescription:
      "Create HVAC, electrical, maintenance, installation, and repair quotes faster with client-ready approvals and real-time signatures.",
    introTitle: "Make urgent repair and installation quotes easier to approve.",
    intro:
      "HVAC and electrical customers need clear pricing, fast timelines, and confidence in the scope. Remote Quote helps you send itemized options after inspection so clients can sign before schedules, parts, or urgency change.",
    painPoints: [
      "Customers need to compare repair, replacement, and upgrade options quickly.",
      "Quotes combine labor, parts, emergency fees, warranty notes, and site conditions.",
      "Verbal approvals are risky when work needs parts, scheduling, or upfront commitment.",
    ],
    workflowBenefits: [
      "Show repair, replacement, and maintenance options in a structured format.",
      "Clarify inclusions, exclusions, warranty notes, and add-ons before work begins.",
      "Collect a signature before dispatching a team or ordering materials.",
    ],
    exampleQuoteItems: [
      "Aircon cleaning, repair, and replacement",
      "Electrical panel, breaker, and wiring work",
      "Preventive maintenance service plans",
      "Emergency callout labor and materials",
    ],
    ctaText: "Create an HVAC or electrical quote now",
  },
  {
    slug: "automotive-detailing-repair-quotes",
    label: "Automotive solutions",
    eyebrow: "Built for detailing, repair, and upgrade shops",
    metadataTitle: "Automotive Detailing and Repair Quote Software | Remote Quote",
    metadataDescription:
      "Create automotive detailing, repair, upgrade, and service quotes faster with client-ready approvals and real-time signatures.",
    introTitle: "Quote vehicle work clearly before the customer drives away.",
    intro:
      "Automotive customers often decide between basic service, premium packages, repairs, and upgrades. Remote Quote helps you present those options cleanly and get signed approval before parts, bay time, or customer attention is lost.",
    painPoints: [
      "Customers compare packages and upgrades but forget details after leaving the shop.",
      "Repair and customization quotes change based on parts, labor, and inspection results.",
      "Approvals get delayed when customers need to confirm through scattered messages.",
    ],
    workflowBenefits: [
      "Package detailing, repairs, accessories, labor, and upgrades into one clear quote.",
      "Offer tiered options while keeping the final recommendation easy to approve.",
      "Secure signature approval before ordering parts or blocking shop time.",
    ],
    exampleQuoteItems: [
      "Interior and exterior detailing packages",
      "Paint correction, ceramic coating, and tinting",
      "Mechanical repair parts and labor",
      "Accessories, upgrades, and installation work",
    ],
    ctaText: "Create an automotive quote now",
  },
] satisfies LandingPageNiche[];

export type NicheLandingSlug = (typeof nicheLandingPages)[number]["slug"];

export const nicheLandingPageSlugs = nicheLandingPages.map(({ slug }) => slug);

export function getNicheLandingPage(slug: string) {
  return nicheLandingPages.find((page) => page.slug === slug);
}
