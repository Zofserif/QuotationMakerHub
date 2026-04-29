import { z } from "zod";

import {
  APP_CURRENCY,
  normalizeCurrency,
  supportedCurrencyCodes,
} from "@/lib/currency";

const toggleTextSchema = z.object({
  enabled: z.boolean(),
  value: z.string().max(10000),
});

const currencySchema = z
  .string()
  .optional()
  .default(APP_CURRENCY)
  .transform((currency) => normalizeCurrency(currency))
  .pipe(z.enum(supportedCurrencyCodes));

export const quoteTemplateSchema = z.object({
  logo: z.object({
    enabled: z.boolean(),
    dataUrl: z
      .string()
      .max(1_500_000)
      .startsWith("data:image/")
      .optional()
      .or(z.literal("")),
  }),
  company: z.object({
    name: toggleTextSchema,
    address: z.string().min(1).max(1000),
    telephone: toggleTextSchema,
    phone: toggleTextSchema,
    email: toggleTextSchema.extend({
      value: z.string().max(320),
    }),
    vatRegTin: toggleTextSchema,
    dateLabel: z.string().min(1).max(60),
    showQuoteNumber: z.boolean(),
  }),
  offerTitle: toggleTextSchema,
  customer: z.object({
    clientNameLabel: z.string().min(1).max(80),
    clientCompany: toggleTextSchema,
    address: toggleTextSchema,
    email: toggleTextSchema,
    contactNumber: toggleTextSchema,
  }),
  requestSummary: toggleTextSchema,
  lineItems: z.object({
    showItemNumber: z.boolean(),
    showDescriptionPicture: z.boolean(),
    detailedDescriptionLabel: z.string().min(1).max(100),
    showQuantity: z.boolean(),
    unit: z.object({
      enabled: z.boolean(),
      options: z.array(z.string().min(1).max(40)).min(1).max(20),
    }),
    unitPrice: z.object({
      currency: currencySchema,
      display: z.enum(["symbol", "text"]),
    }),
    vat: z.object({
      enabled: z.boolean(),
      mode: z.enum(["inclusive", "exclusive"]),
      rate: z.coerce.number().min(0).max(1),
    }),
  }),
  paymentTerms: z.string().min(1).max(10000),
  termsAndConditions: z.string().min(1).max(10000),
  signature: z.object({
    clientNameInputEnabled: z.boolean(),
    nameCase: z.enum(["uppercase", "title"]),
  }),
  footer: toggleTextSchema,
});
