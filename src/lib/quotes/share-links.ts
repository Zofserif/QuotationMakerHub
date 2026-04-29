import type {
  Quote,
  QuoteShareLink,
  QuoteStatus,
  UnavailableQuoteShareLink,
} from "@/lib/quotes/types";

export function isQuoteShareable(status: QuoteStatus) {
  return status !== "draft" && status !== "locked";
}

export function buildQuoteShareLinks(quote: Quote): QuoteShareLink[] {
  return quote.recipients.flatMap((recipient) => {
    if (!recipient.accessToken) {
      return [];
    }

    return {
      recipientId: recipient.id,
      name: recipient.name,
      email: recipient.email,
      status: recipient.status,
      accessToken: recipient.accessToken,
      accessTokenExpiresAt: recipient.accessTokenExpiresAt,
      signingPath: `/sign/${recipient.accessToken}`,
    };
  });
}

export function buildUnavailableQuoteShareLinks(
  quote: Quote,
): UnavailableQuoteShareLink[] {
  return quote.recipients.flatMap((recipient) => {
    if (recipient.accessToken || !recipient.shareLinkIssued) {
      return [];
    }

    return {
      recipientId: recipient.id,
      name: recipient.name,
      email: recipient.email,
      status: recipient.status,
      reason: "legacy_hash_only" as const,
    };
  });
}
