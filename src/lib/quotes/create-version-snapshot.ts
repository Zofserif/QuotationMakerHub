import { createHash } from "crypto";

import { normalizeCurrency } from "@/lib/currency";
import { defaultQuoteTemplate } from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { Quote, QuoteVersionSnapshot } from "./types";

export function createVersionSnapshot(
  quote: Quote,
  template: QuoteTemplate = defaultQuoteTemplate,
): QuoteVersionSnapshot {
  return {
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    currency: normalizeCurrency(quote.currency),
    business: {
      name: template.company.name.enabled ? template.company.name.value : "",
      email: template.company.email.enabled ? template.company.email.value : "",
      address: template.company.address,
      logoDataUrl:
        template.logo.enabled && template.logo.dataUrl
          ? template.logo.dataUrl
          : undefined,
      telephone: template.company.telephone.enabled
        ? template.company.telephone.value
        : undefined,
      phone: template.company.phone.enabled
        ? template.company.phone.value
        : undefined,
      vatRegTin: template.company.vatRegTin.enabled
        ? template.company.vatRegTin.value
        : undefined,
    },
    template,
    client: quote.client,
    recipients: quote.recipients.map(({ id, name, email, role }) => ({
      id,
      name,
      email,
      role,
    })),
    lineItems: quote.lineItems.map(({ descriptionImageUrl, ...lineItem }) => {
      void descriptionImageUrl;
      return lineItem;
    }),
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
