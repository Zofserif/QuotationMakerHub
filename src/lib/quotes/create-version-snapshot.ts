import { createHash } from "crypto";
import type { Quote, QuoteVersionSnapshot } from "./types";

export function createVersionSnapshot(quote: Quote): QuoteVersionSnapshot {
  return {
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    currency: quote.currency,
    business: {
      name: "Quotation Maker Hub",
      email: "quotes@example.com",
      address: "MVP business profile placeholder",
    },
    client: quote.client,
    recipients: quote.recipients.map(({ id, name, email, role }) => ({
      id,
      name,
      email,
      role,
    })),
    lineItems: quote.lineItems,
    signatureFields: quote.signatureFields,
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor,
    taxMinor: quote.taxMinor,
    totalMinor: quote.totalMinor,
    validUntil: quote.validUntil,
    terms: quote.terms,
    notes: quote.notes,
  };
}

export function hashSnapshot(snapshot: QuoteVersionSnapshot) {
  return createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}
