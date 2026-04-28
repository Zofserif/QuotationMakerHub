import { z } from "zod";

import {
  APP_CURRENCY,
  normalizeCurrency,
  supportedCurrencyCodes,
} from "@/lib/currency";
import { lineItemImageMimeTypes } from "@/lib/line-item-data/types";
import { quoteTemplateSchema } from "@/lib/quote-templates/validation";

export type ValidationIssue = {
  code: string;
  format?: string;
  message: string;
  path: Array<string | number>;
};

export type ValidationErrorDetails = {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
  issues: ValidationIssue[];
};

export const clientSchema = z.object({
  companyName: z.string().max(200).optional().or(z.literal("")),
  address: z.string().max(1000).optional().or(z.literal("")),
  contactName: z.string().min(1).max(160),
  email: z.string().email().max(320).optional().or(z.literal("")),
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

const currencySchema = z
  .string()
  .optional()
  .default(APP_CURRENCY)
  .transform((currency) => normalizeCurrency(currency))
  .pipe(z.enum(supportedCurrencyCodes));

export const quoteDraftSchema = z.object({
  quotationName: z.string().trim().min(1).max(160),
  title: z.string().min(1).max(160),
  client: clientSchema,
  currency: currencySchema,
  validUntil: z.string().date().optional().or(z.literal("")),
  requestSummary: z.string().max(10000).optional().or(z.literal("")),
  terms: z.string().max(10000).optional().or(z.literal("")),
  notes: z.string().max(10000).optional().or(z.literal("")),
  templateSnapshot: quoteTemplateSchema.optional(),
  quoteLevelDiscountMinor: z.coerce.number().int().min(0).optional(),
  lineItems: z.array(quoteLineItemInputSchema).min(1),
  quoterPrintedName: z.string().max(160).optional().or(z.literal("")),
});

export const signatureUploadSchema = z.object({
  signatureFieldId: z.string().uuid(),
  imageBase64: z.string().startsWith("data:image/png;base64,"),
  sourceMethod: z.enum(["camera", "upload", "draw"]),
});

export const quoterSignatureUploadSchema = z.object({
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
    const flattened = parsed.error.flatten();

    return {
      ok: false as const,
      errors: {
        formErrors: flattened.formErrors,
        fieldErrors: flattened.fieldErrors as ValidationErrorDetails["fieldErrors"],
        issues: parsed.error.issues.map((issue) => ({
          code: issue.code,
          format: "format" in issue ? issue.format : undefined,
          message: issue.message,
          path: issue.path.filter(
            (segment): segment is string | number =>
              typeof segment === "string" || typeof segment === "number",
          ),
        })),
      } satisfies ValidationErrorDetails,
    };
  }

  return {
    ok: true as const,
    data: parsed.data as z.infer<T>,
  };
}
