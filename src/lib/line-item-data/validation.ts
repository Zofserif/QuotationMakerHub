import { z } from "zod";

import { lineItemImageMimeTypes } from "@/lib/line-item-data/types";

export const lineItemImageMaxBytes = 2_000_000;

export const lineItemDataDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  detailedDescription: z.string().trim().min(1).max(10000),
  unit: z.string().trim().min(1).max(40),
  unitPriceMinor: z.coerce.number().int().min(0),
  descriptionImageStoragePath: z.string().max(1000).optional().or(z.literal("")),
  descriptionImageMimeType: z.enum(lineItemImageMimeTypes).optional(),
});

export function isLineItemImageMimeType(
  value: string,
): value is (typeof lineItemImageMimeTypes)[number] {
  return lineItemImageMimeTypes.some((mimeType) => mimeType === value);
}
