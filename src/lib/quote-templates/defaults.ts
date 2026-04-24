import type { QuoteDraft } from "@/lib/quotes/types";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import { APP_CURRENCY, normalizeCurrency } from "@/lib/currency";

export const defaultQuoteTemplate: QuoteTemplate = {
  logo: {
    enabled: false,
    dataUrl: "",
  },
  company: {
    name: {
      enabled: true,
      value: "Quotation Maker Hub",
    },
    address: "",
    telephone: {
      enabled: false,
      value: "",
    },
    phone: {
      enabled: false,
      value: "",
    },
    email: {
      enabled: true,
      value: "quotes@example.com",
    },
    vatRegTin: {
      enabled: false,
      value: "",
    },
    dateLabel: "Date",
    quoteNumberFormat: "Q-MMDDYYYY-NNNN",
  },
  offerTitle: {
    enabled: true,
    value: "Quotation",
  },
  customer: {
    clientNameLabel: "Client Name",
    clientCompany: {
      enabled: true,
      value: "Client Company",
    },
    address: {
      enabled: false,
      value: "Address",
    },
    email: {
      enabled: true,
      value: "Email",
    },
    contactNumber: {
      enabled: true,
      value: "Contact #",
    },
  },
  requestSummary: {
    enabled: false,
    value: "",
  },
  lineItems: {
    showItemNumber: true,
    showDescriptionPicture: false,
    detailedDescriptionLabel: "Detailed Description",
    showQuantity: true,
    unit: {
      enabled: true,
      options: ["Unit", "Lot", "Month"],
    },
    unitPrice: {
      currency: APP_CURRENCY,
      display: "symbol",
    },
    vat: {
      enabled: true,
      mode: "exclusive",
      rate: 0.12,
    },
  },
  paymentTerms: "50% down payment, 50% on completion.",
  termsAndConditions: "This quotation is valid until the stated validity date.",
  signature: {
    clientNameInputEnabled: true,
    nameCase: "title",
  },
  footer: {
    enabled: false,
    value: "",
  },
};

export function mergeQuoteTemplate(
  value?: Partial<QuoteTemplate> | null,
): QuoteTemplate {
  if (!value) {
    return structuredClone(defaultQuoteTemplate);
  }

  return {
    ...defaultQuoteTemplate,
    ...value,
    logo: {
      ...defaultQuoteTemplate.logo,
      ...value.logo,
    },
    company: {
      ...defaultQuoteTemplate.company,
      ...value.company,
      name: {
        ...defaultQuoteTemplate.company.name,
        ...value.company?.name,
      },
      telephone: {
        ...defaultQuoteTemplate.company.telephone,
        ...value.company?.telephone,
      },
      phone: {
        ...defaultQuoteTemplate.company.phone,
        ...value.company?.phone,
      },
      email: {
        ...defaultQuoteTemplate.company.email,
        ...value.company?.email,
      },
      vatRegTin: {
        ...defaultQuoteTemplate.company.vatRegTin,
        ...value.company?.vatRegTin,
      },
    },
    offerTitle: {
      ...defaultQuoteTemplate.offerTitle,
      ...value.offerTitle,
    },
    customer: {
      ...defaultQuoteTemplate.customer,
      ...value.customer,
      clientCompany: {
        ...defaultQuoteTemplate.customer.clientCompany,
        ...value.customer?.clientCompany,
      },
      address: {
        ...defaultQuoteTemplate.customer.address,
        ...value.customer?.address,
      },
      email: {
        ...defaultQuoteTemplate.customer.email,
        ...value.customer?.email,
      },
      contactNumber: {
        ...defaultQuoteTemplate.customer.contactNumber,
        ...value.customer?.contactNumber,
      },
    },
    requestSummary: {
      ...defaultQuoteTemplate.requestSummary,
      ...value.requestSummary,
    },
    lineItems: {
      ...defaultQuoteTemplate.lineItems,
      ...value.lineItems,
      unit: {
        ...defaultQuoteTemplate.lineItems.unit,
        ...value.lineItems?.unit,
      },
      unitPrice: {
        ...defaultQuoteTemplate.lineItems.unitPrice,
        ...value.lineItems?.unitPrice,
        currency: normalizeCurrency(value.lineItems?.unitPrice?.currency),
      },
      vat: {
        ...defaultQuoteTemplate.lineItems.vat,
        ...value.lineItems?.vat,
      },
    },
    signature: {
      ...defaultQuoteTemplate.signature,
      ...value.signature,
    },
    footer: {
      ...defaultQuoteTemplate.footer,
      ...value.footer,
    },
  };
}

export function getTemplateDefaultLineItemUnit(template: QuoteTemplate) {
  return template.lineItems.unit.options[0] ?? "Unit";
}

export function getTemplateDefaultLineItemTaxRate(template: QuoteTemplate) {
  return template.lineItems.vat.enabled ? template.lineItems.vat.rate : 0;
}

export function createDraftFromTemplate(template: QuoteTemplate): QuoteDraft {
  return {
    title: template.offerTitle.enabled
      ? template.offerTitle.value || "Quotation"
      : "Quotation",
    client: {
      companyName: "",
      contactName: "",
      address: "",
      email: "",
      phone: "",
    },
    currency: normalizeCurrency(template.lineItems.unitPrice.currency),
    validUntil: "",
    requestSummary: template.requestSummary.enabled
      ? template.requestSummary.value
      : "",
    terms: [
      "Payment Terms",
      template.paymentTerms,
      "",
      "Terms & Conditions",
      template.termsAndConditions,
    ].join("\n"),
    notes: [
      template.requestSummary.enabled ? template.requestSummary.value : "",
      template.footer.enabled ? template.footer.value : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    templateSnapshot: structuredClone(template),
    quoterPrintedName: "",
    quoterSignatureAsset: null,
    lineItems: [
      {
        name: "",
        description: "",
        unit: getTemplateDefaultLineItemUnit(template),
        quantity: 1,
        unitPriceMinor: 0,
        discountMinor: 0,
        taxRate: getTemplateDefaultLineItemTaxRate(template),
      },
    ],
  };
}
