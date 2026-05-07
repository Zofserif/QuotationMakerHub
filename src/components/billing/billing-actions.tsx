"use client";

import { Coffee, Headset, Mail, Sparkles, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  billingPlanDetails,
  buildUpgradeMailto,
  COFFEE_DONATION_URL,
  UPGRADE_CONTACT_EMAIL,
  type WorkspacePlan,
} from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type BillingActionEntitlement = Pick<
  WorkspaceEntitlement,
  | "expiredPaidPlanLabel"
  | "paidPlanExpiredAt"
  | "plan"
  | "planLabel"
  | "renewsAt"
  | "trialEndsAt"
  | "workspaceRef"
  | "requesterEmail"
  | "requesterUserId"
>;

type ModalMode = "plan" | "upgrade";
type SupportKind = "request" | "issue";
type SupportFormStatus = {
  type: "error" | "success";
  text: string;
} | null;

const SUPPORT_MESSAGE_MAX_LENGTH = 4000;

export function PlanBadgeButton({
  className,
  entitlement,
}: {
  className?: string;
  entitlement: BillingActionEntitlement;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const badgeLabel = planBadgeLabel(entitlement);

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={cn(
          "inline-flex w-fit items-center rounded-md border border-stone-200 bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2",
          className,
        )}
        type="button"
        onClick={() => setModalOpen(true)}
      >
        {badgeLabel}
      </button>

      <BillingPlanModal
        entitlement={entitlement}
        mode="plan"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

export function DashboardBillingActions({
  entitlement,
}: {
  entitlement: BillingActionEntitlement;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UpgradeModalButton entitlement={entitlement} />
      {isPaidPlan(entitlement.plan) ? (
        <CustomerSupportButton />
      ) : (
        <CoffeeDonationButton />
      )}
    </div>
  );
}

export function UpgradeModalButton({
  className,
  entitlement,
  size = "sm",
}: {
  className?: string;
  entitlement: BillingActionEntitlement;
  size?: "sm" | "md";
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const label = upgradeButtonLabel(entitlement.plan);

  if (!label) {
    return null;
  }

  return (
    <>
      <Button
        className={className}
        size={size}
        type="button"
        onClick={() => setModalOpen(true)}
      >
        <Sparkles className="size-4" />
        {label}
      </Button>

      <BillingPlanModal
        entitlement={entitlement}
        mode="upgrade"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function CoffeeDonationButton() {
  if (!COFFEE_DONATION_URL) {
    return (
      <Button
        disabled
        size="sm"
        title="Configure NEXT_PUBLIC_COFFEE_DONATION_URL to enable donations."
        type="button"
        variant="secondary"
      >
        <Coffee className="size-4" />
      </Button>
    );
  }

  return (
    <LinkButton
      href={COFFEE_DONATION_URL}
      rel="noreferrer"
      size="sm"
      target="_blank"
      variant="secondary"
    >
      <Coffee className="size-4" />
    </LinkButton>
  );
}

function CustomerSupportButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        aria-haspopup="dialog"
        aria-label="Contact customer support"
        size="sm"
        title="Contact customer support"
        type="button"
        variant="secondary"
        onClick={() => setModalOpen(true)}
      >
        <Headset className="size-4" />
      </Button>

      <CustomerSupportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function CustomerSupportModal({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const kindId = useId();
  const messageId = useId();
  const [kind, setKind] = useState<SupportKind>("request");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SupportFormStatus>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setStatus({
        type: "error",
        text: "Enter a message before sending.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/dashboard/support", {
        body: JSON.stringify({ kind, message: trimmedMessage }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus({
          type: "error",
          text:
            payload?.error?.message ??
            "Could not send your support message.",
        });
        return;
      }

      setMessage("");
      setKind("request");
      setStatus({
        type: "success",
        text: "Support message sent.",
      });
    } catch {
      setStatus({
        type: "error",
        text: "Could not send your support message.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-stone-950" id={titleId}>
              Customer support
            </h2>
            <p
              className="mt-1 text-sm leading-6 text-stone-500"
              id={descriptionId}
            >
              Send a request or report an issue from this workspace.
            </p>
          </div>
          <Button
            aria-label="Close customer support"
            disabled={isSubmitting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor={kindId}>Type</Label>
              <select
                className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-100 disabled:cursor-not-allowed disabled:bg-stone-100"
                disabled={isSubmitting}
                id={kindId}
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as SupportKind)
                }
              >
                <option value="request">Request</option>
                <option value="issue">Issue</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={messageId}>Message</Label>
                <span className="text-xs font-medium text-stone-500">
                  {message.length}/{SUPPORT_MESSAGE_MAX_LENGTH}
                </span>
              </div>
              <Textarea
                disabled={isSubmitting}
                id={messageId}
                maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                placeholder="Write your message..."
                required
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setStatus(null);
                }}
              />
            </div>

            {status ? (
              <p
                aria-live="polite"
                className={cn(
                  "rounded-md border p-3 text-sm font-medium",
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {status.text}
              </p>
            ) : null}
          </div>

          <footer className="flex justify-end gap-2 border-t border-stone-200 px-5 py-4">
            <Button
              disabled={isSubmitting}
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button loading={isSubmitting} loadingText="Sending..." type="submit">
              <Mail className="size-4" />
              Send
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function BillingPlanModal({
  entitlement,
  mode,
  onClose,
  open,
}: {
  entitlement: BillingActionEntitlement;
  mode: ModalMode;
  onClose: () => void;
  open: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const isUpgradeMode = mode === "upgrade";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-stone-950" id={titleId}>
              {isUpgradeMode ? "Upgrade plan" : "Your plan"}
            </h2>
            <p
              className="mt-1 text-sm leading-6 text-stone-500"
              id={descriptionId}
            >
              {isUpgradeMode
                ? "Compare plans and contact Gmail for partner upgrade inquiries."
                : "Review each plan and see which one your workspace is currently using."}
            </p>
          </div>
          <Button
            aria-label="Close plan details"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </header>

        <div className="grid gap-3 p-5 md:grid-cols-3">
          {billingPlanDetails.map((plan) => (
            <PlanCard
              currentPlan={entitlement.plan}
              entitlement={entitlement}
              key={plan.plan}
              mode={mode}
              plan={plan}
            />
          ))}
        </div>

        {isUpgradeMode && !UPGRADE_CONTACT_EMAIL ? (
          <p className="border-t border-stone-200 px-5 py-4 text-sm font-medium text-amber-700">
            Configure NEXT_PUBLIC_UPGRADE_CONTACT_EMAIL to enable the upgrade
            email buttons.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function PlanCard({
  currentPlan,
  entitlement,
  mode,
  plan,
}: {
  currentPlan: WorkspacePlan;
  entitlement: BillingActionEntitlement;
  mode: ModalMode;
  plan: (typeof billingPlanDetails)[number];
}) {
  const isCurrent = plan.plan === currentPlan;
  const inquiryHref = shouldShowInquiryAction(currentPlan, plan.plan)
    ? buildUpgradeMailto({
        currentPlan,
        requesterEmail: entitlement.requesterEmail,
        requesterUserId: entitlement.requesterUserId,
        targetPlan: plan.plan,
        workspaceRef: entitlement.workspaceRef,
      })
    : null;

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-lg border p-4",
        isCurrent
          ? "border-stone-950 bg-stone-50"
          : "border-stone-200 bg-white",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-stone-950">{plan.name}</h3>
        {isCurrent ? <Badge>Current plan</Badge> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {plan.description}
      </p>
      <ul className="mt-3 flex-1 space-y-2 text-sm text-stone-700">
        {plan.features.map((feature) => (
          <li className="flex gap-2" key={feature}>
            <span aria-hidden="true" className="text-stone-400">
              -
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {mode === "plan" && isCurrent ? (
        <PlanRenewalMessage entitlement={entitlement} />
      ) : null}

      {mode === "upgrade" ? (
        <div className="mt-4">
          {isCurrent ? (
            <Button
              className="w-full"
              disabled
              type="button"
              variant="secondary"
            >
              Current plan
            </Button>
          ) : inquiryHref ? (
            <LinkButton className="w-full" href={inquiryHref} size="sm">
              <Mail className="size-4" />
              Contact Gmail for inquiry
            </LinkButton>
          ) : shouldShowInquiryAction(currentPlan, plan.plan) ? (
            <Button className="w-full" disabled size="sm" type="button">
              <Mail className="size-4" />
              Contact Gmail for inquiry
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function PlanRenewalMessage({
  entitlement,
}: {
  entitlement: BillingActionEntitlement;
}) {
  if (entitlement.paidPlanExpiredAt && entitlement.expiredPaidPlanLabel) {
    return (
      <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
        {entitlement.expiredPaidPlanLabel} renewal expired on{" "}
        {formatPlanDate(entitlement.paidPlanExpiredAt)}. Upgrade or renew to
        restore partner access.
      </p>
    );
  }

  if (!isPaidPlan(entitlement.plan)) {
    return null;
  }

  return (
    <p className="mt-4 rounded-md border border-stone-200 bg-white p-3 text-sm font-medium text-stone-700">
      {entitlement.renewsAt
        ? `Renews on ${formatPlanDate(entitlement.renewsAt)}`
        : "Renewal date not set. Contact Gmail to confirm renewal."}
    </p>
  );
}

function upgradeButtonLabel(plan: WorkspacePlan) {
  if (plan === "free_trial") {
    return "Upgrade to Partner Plan";
  }

  if (plan === "partner_monthly") {
    return "Upgrade to Yearly Plan";
  }

  return null;
}

function planBadgeLabel(entitlement: BillingActionEntitlement) {
  if (entitlement.paidPlanExpiredAt && entitlement.expiredPaidPlanLabel) {
    return `${entitlement.expiredPaidPlanLabel} expired ${formatPlanDate(
      entitlement.paidPlanExpiredAt,
    )}`;
  }

  if (entitlement.plan === "free_trial" && entitlement.trialEndsAt) {
    return `${entitlement.planLabel} - Expires ${formatPlanDate(
      entitlement.trialEndsAt,
    )}`;
  }

  return entitlement.planLabel;
}

function isPaidPlan(plan: WorkspacePlan) {
  return plan === "partner_monthly" || plan === "partner_yearly";
}

function formatPlanDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function shouldShowInquiryAction(
  currentPlan: WorkspacePlan,
  targetPlan: WorkspacePlan,
) {
  if (targetPlan === "free_trial" || currentPlan === targetPlan) {
    return false;
  }

  if (currentPlan === "free_trial") {
    return targetPlan === "partner_monthly" || targetPlan === "partner_yearly";
  }

  return currentPlan === "partner_monthly" && targetPlan === "partner_yearly";
}
