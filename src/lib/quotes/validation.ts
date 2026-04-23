import { z } from "zod";

import { APP_CURRENCY, normalizeCurrency } from "@/lib/currency";
import { lineItemImageMimeTypes } from "@/lib/line-item-data/types";

export const clientSchema = z.object({
  companyName: z.string().max(200).optional().or(z.literal("")),
  contactName: z.string().min(1).max(160),
  email: z.string().email().max(320),
  phone: z.string().max(40).optional().or(z.literal("")),
});

export const quoteLineItemInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(40).default("Unit"),
  quantity: z.coerce.number().positive(),
  unitPriceMinor: z.coerce.number().int().min(0),
  discountMinor: z.coerce.number().int().min(0),
  taxRate: z.coerce.number().min(0).max(1),
  descriptionImageStoragePath: z.string().max(1000).optional().or(z.literal("")),
  descriptionImageMimeType: z.enum(lineItemImageMimeTypes).optional(),
});

export const quoteDraftSchema = z.object({
  title: z.string().min(1).max(160),
  client: clientSchema,
  currency: z
    .string()
    .optional()
    .default(APP_CURRENCY)
    .transform((currency) => normalizeCurrency(currency)),
  validUntil: z.string().date().optional().or(z.literal("")),
  terms: z.string().max(10000).optional().or(z.literal("")),
  notes: z.string().max(10000).optional().or(z.literal("")),
  quoteLevelDiscountMinor: z.coerce.number().int().min(0).optional(),
  lineItems: z.array(quoteLineItemInputSchema).min(1),
});

export const signatureUploadSchema = z.object({
  signatureFieldId: z.string().uuid(),
  imageBase64: z.string().startsWith("data:image/png;base64,"),
  sourceMethod: z.enum(["camera", "upload", "draw"]),
});

export const acceptQuoteSchema = z.object({
  typedName: z.string().min(1).max(160),
  confirmationChecked: z.literal(true),
});

export function parseJsonBody<T extends z.ZodType>(schema: T, data: unknown) {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten(),
    };
  }

  return {
    ok: true as const,
    data: parsed.data as z.infer<T>,
  };
}
