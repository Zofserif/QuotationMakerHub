"use client";

import { Coffee, Headset, Mail, Sparkles, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import {
  PaidPlanSupportBlock,
  PricingPlanSections,
} from "@/components/billing/pricing-plan-sections";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceEntitlement } from "@/lib/billing/entitlements";
import {
  billingPlanDetails,
  COFFEE_DONATION_URL,
  paidPlanSupportDetails,
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
type FormStatus = {
  type: "error" | "success";
  text: string;
} | null;
type UpgradeTargetPlan = Extract<
  WorkspacePlan,
  "partner_monthly" | "partner_yearly"
>;

const SUPPORT_MESSAGE_MAX_LENGTH = 4000;
const UPGRADE_COMMENT_MAX_LENGTH = 4000;
const UPGRADE_CONTACT_NUMBER_MAX_LENGTH = 80;

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
  const [status, setStatus] = useState<FormStatus>(null);
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
  const [upgradeCallPlan, setUpgradeCallPlan] =
    useState<UpgradeTargetPlan | null>(null);

  function closePlanModal() {
    setUpgradeCallPlan(null);
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !upgradeCallPlan) {
        setUpgradeCallPlan(null);
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, upgradeCallPlan]);

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
                ? "Compare plans and book an upgrade call for your workspace."
                : "Review each plan and see which one your workspace is currently using."}
            </p>
          </div>
          <Button
            aria-label="Close plan details"
            size="icon"
            type="button"
            variant="ghost"
            onClick={closePlanModal}
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
              onRequestUpgrade={setUpgradeCallPlan}
            />
          ))}
        </div>

        <div className="border-t border-stone-200 px-5 py-5">
          <PaidPlanSupportBlock support={paidPlanSupportDetails} />
        </div>
      </section>

      {isUpgradeMode && upgradeCallPlan ? (
        <UpgradeCallRequestModal
          open
          targetPlan={upgradeCallPlan}
          onClose={() => setUpgradeCallPlan(null)}
          onDone={closePlanModal}
        />
      ) : null}
    </div>
  );
}

function PlanCard({
  currentPlan,
  entitlement,
  mode,
  plan,
  onRequestUpgrade,
}: {
  currentPlan: WorkspacePlan;
  entitlement: BillingActionEntitlement;
  mode: ModalMode;
  plan: (typeof billingPlanDetails)[number];
  onRequestUpgrade: (plan: UpgradeTargetPlan) => void;
}) {
  const isCurrent = plan.plan === currentPlan;
  const upgradeTargetPlan = isUpgradeTargetPlan(plan.plan) ? plan.plan : null;
  const canRequestUpgrade =
    upgradeTargetPlan !== null &&
    shouldShowInquiryAction(currentPlan, upgradeTargetPlan);

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
        <div>
          <h3 className="font-semibold text-stone-950">{plan.name}</h3>
          {plan.price ? (
            <p className="mt-1 text-xl font-bold text-stone-950">
              {plan.price}
            </p>
          ) : null}
        </div>
        {isCurrent ? <Badge>Current plan</Badge> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {plan.description}
      </p>
      <PricingPlanSections className="flex-1" plan={plan} />
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
          ) : canRequestUpgrade ? (
            <Button
              className="w-full"
              size="sm"
              type="button"
              onClick={() => {
                if (upgradeTargetPlan) {
                  onRequestUpgrade(upgradeTargetPlan);
                }
              }}
            >
              <Mail className="size-4" />
              Book an upgrade call
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function UpgradeCallRequestModal({
  onClose,
  onDone,
  open,
  targetPlan,
}: {
  onClose: () => void;
  onDone: () => void;
  open: boolean;
  targetPlan: UpgradeTargetPlan;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const contactNumberId = useId();
  const commentId = useId();
  const [contactNumber, setContactNumber] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<FormStatus>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const targetPlanLabel = upgradeRequestPlanLabel(targetPlan);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        if (sent) {
          onDone();
        } else {
          onClose();
        }
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSubmitting, onClose, onDone, open, sent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContactNumber = contactNumber.trim();
    const trimmedComment = comment.trim();

    if (!trimmedComment) {
      setStatus({
        type: "error",
        text: "Enter a comment before sending.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/dashboard/upgrade-call", {
        body: JSON.stringify({
          contactNumber: trimmedContactNumber || undefined,
          comment: trimmedComment,
          targetPlan,
        }),
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
            "Could not send your upgrade call request.",
        });
        return;
      }

      setSent(true);
      setContactNumber("");
      setComment("");
      setStatus({
        type: "success",
        text: "Upgrade call request sent.",
      });
    } catch {
      setStatus({
        type: "error",
        text: "Could not send your upgrade call request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  const closeAction = sent ? onDone : onClose;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-stone-950/60 p-4">
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
              Book an upgrade call
            </h2>
            <p
              className="mt-1 text-sm leading-6 text-stone-500"
              id={descriptionId}
            >
              Tell us what you want to discuss for {targetPlanLabel}. We will
              use your account email to follow up.
            </p>
          </div>
          <Button
            aria-label="Close upgrade call request"
            disabled={isSubmitting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={closeAction}
          >
            <X className="size-5" />
          </Button>
        </header>

        {sent ? (
          <div className="space-y-4 p-5">
            {status ? (
              <p
                aria-live="polite"
                className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
              >
                {status.text}
              </p>
            ) : null}
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor={contactNumberId}>Contact number (optional)</Label>
                <Input
                  disabled={isSubmitting}
                  id={contactNumberId}
                  maxLength={UPGRADE_CONTACT_NUMBER_MAX_LENGTH}
                  placeholder="Phone or mobile number"
                  type="tel"
                  value={contactNumber}
                  onChange={(event) => {
                    setContactNumber(event.target.value);
                    setStatus(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={commentId}>Comment</Label>
                  <span className="text-xs font-medium text-stone-500">
                    {comment.length}/{UPGRADE_COMMENT_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  disabled={isSubmitting}
                  id={commentId}
                  maxLength={UPGRADE_COMMENT_MAX_LENGTH}
                  placeholder="Tell us why you want the upgrade call..."
                  required
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
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
              <Button
                loading={isSubmitting}
                loadingText="Sending..."
                type="submit"
              >
                <Mail className="size-4" />
                Send request
              </Button>
            </footer>
          </form>
        )}

        {sent ? (
          <footer className="flex justify-end gap-2 border-t border-stone-200 px-5 py-4">
            <Button type="button" onClick={onDone}>
              Done
            </Button>
          </footer>
        ) : null}
      </section>
    </div>
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
        {formatPlanDate(entitlement.paidPlanExpiredAt)}. Book an upgrade call or
        renew to restore partner access.
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
        : "Renewal date not set. Book an upgrade call to confirm renewal."}
    </p>
  );
}

function upgradeButtonLabel(plan: WorkspacePlan) {
  if (plan === "free_trial") {
    return "Book an upgrade call";
  }

  if (plan === "partner_monthly") {
    return "Book an upgrade call";
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

function upgradeRequestPlanLabel(plan: UpgradeTargetPlan) {
  const details = billingPlanDetails.find((candidate) => candidate.plan === plan);

  return details?.price
    ? `${details.name} - ${details.price}`
    : (details?.name ?? "selected plan");
}

function isUpgradeTargetPlan(plan: WorkspacePlan): plan is UpgradeTargetPlan {
  return plan === "partner_monthly" || plan === "partner_yearly";
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
