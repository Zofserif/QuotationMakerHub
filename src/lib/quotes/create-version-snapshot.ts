import { createHash } from "crypto";

import { normalizeCurrency } from "@/lib/currency";
import { defaultQuoteTemplate } from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { Quote, QuoteVersionSnapshot } from "./types";

export function createVersionSnapshot(
  quote: Quote,
  template: QuoteTemplate = defaultQuoteTemplate,
): QuoteVersionSnapshot {
  const templateSnapshot = quote.templateSnapshot ?? template;
  const quoterSignatureAsset = quote.quoterSignatureAsset
    ? {
        ...quote.quoterSignatureAsset,
        dataUrl: undefined,
      }
    : undefined;

  return {
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    currency: normalizeCurrency(quote.currency),
    business: {
      name: templateSnapshot.company.name.enabled
        ? templateSnapshot.company.name.value
        : "",
      email: templateSnapshot.company.email.enabled
        ? templateSnapshot.company.email.value
        : "",
      address: templateSnapshot.company.address,
      logoDataUrl:
        templateSnapshot.logo.enabled && templateSnapshot.logo.dataUrl
          ? templateSnapshot.logo.dataUrl
          : undefined,
      telephone: templateSnapshot.company.telephone.enabled
        ? templateSnapshot.company.telephone.value
        : undefined,
      phone: templateSnapshot.company.phone.enabled
        ? templateSnapshot.company.phone.value
        : undefined,
      vatRegTin: templateSnapshot.company.vatRegTin.enabled
        ? templateSnapshot.company.vatRegTin.value
        : undefined,
    },
    template: templateSnapshot,
    client: quote.client,
    recipients: quote.recipients.map(({ id, name, email, role }) => ({
      id,
      name,
      email: email ?? "",
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
    requestSummary: quote.requestSummary,
    validUntil: quote.validUntil,
    issuedAt: quote.sentAt,
    terms: quote.terms,
    notes: quote.notes,
    quoterSignature: quote.quoterPrintedName
      ? {
          printedName: quote.quoterPrintedName,
          asset: quoterSignatureAsset,
        }
      : undefined,
  };
}

export function hashSnapshot(snapshot: QuoteVersionSnapshot) {
  return createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}
