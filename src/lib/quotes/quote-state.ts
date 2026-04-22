import type { Quote, QuoteStatus, RecipientStatus } from "./types";

const editableStatuses = new Set<QuoteStatus>([
  "draft",
  "sent",
  "viewed",
  "rejected",
  "expired",
]);

export function isQuoteEditable(status: QuoteStatus) {
  return editableStatuses.has(status);
}

export function getAggregateQuoteStatus(quote: Pick<Quote, "recipients">) {
  const statuses = quote.recipients.map((recipient) => recipient.status);

  if (statuses.length === 0) {
    return "draft" satisfies QuoteStatus;
  }

  if (statuses.every((status) => status === "accepted")) {
    return "locked" satisfies QuoteStatus;
  }

  if (statuses.some((status) => status === "accepted" || status === "signed")) {
    return "partially_signed" satisfies QuoteStatus;
  }

  if (statuses.some((status) => status === "viewed")) {
    return "viewed" satisfies QuoteStatus;
  }

  if (statuses.some((status) => status === "rejected")) {
    return "rejected" satisfies QuoteStatus;
  }

  if (statuses.every((status) => status === "expired")) {
    return "expired" satisfies QuoteStatus;
  }

  return "sent" satisfies QuoteStatus;
}

export function canRecipientMutate(status: RecipientStatus) {
  return !["accepted", "rejected", "expired"].includes(status);
}

export function statusLabel(status: QuoteStatus | RecipientStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
