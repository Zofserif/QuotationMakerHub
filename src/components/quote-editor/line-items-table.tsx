"use client";

import { Database, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownText } from "@/components/ui/markdown-text";
import { Textarea } from "@/components/ui/textarea";
import { getLineItemImageSrc } from "@/lib/line-item-data/images";
import type { LineItemData } from "@/lib/line-item-data/types";
import {
  getTemplateDefaultLineItemTaxRate,
  getTemplateDefaultLineItemUnit,
} from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { QuoteDraft } from "@/lib/quotes/types";
import { cn, formatMoney } from "@/lib/utils";
import { calculateLineTotalMinor } from "@/lib/quotes/calculate-totals";

type LineItemInput = QuoteDraft["lineItems"][number];

const lineItemLayoutClassNames = {
  "true-true": {
    header:
      "grid-cols-[1.5fr_0.45fr_0.55fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
    row: "xl:grid-cols-[1.5fr_0.45fr_0.55fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
  },
  "true-false": {
    header: "grid-cols-[1.5fr_0.45fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
    row: "xl:grid-cols-[1.5fr_0.45fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
  },
  "false-true": {
    header: "grid-cols-[1.5fr_0.55fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
    row: "xl:grid-cols-[1.5fr_0.55fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
  },
  "false-false": {
    header: "grid-cols-[1.5fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
    row: "xl:grid-cols-[1.5fr_0.75fr_0.75fr_0.55fr_0.8fr_44px]",
  },
} as const;

export function LineItemsTable({
  lineItems,
  currency,
  lineItemData = [],
  template,
  onChange,
}: {
  lineItems: LineItemInput[];
  currency: string;
  lineItemData?: LineItemData[];
  template: QuoteTemplate;
  onChange: (lineItems: LineItemInput[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const quantityEnabled = template.lineItems.showQuantity;
  const unitEnabled = template.lineItems.unit.enabled;
  const defaultUnit = getTemplateDefaultLineItemUnit(template);
  const defaultTaxRate = getTemplateDefaultLineItemTaxRate(template);
  const descriptionPlaceholder =
    template.lineItems.detailedDescriptionLabel.trim() ||
    "Detailed description markdown";
  const layoutKey = `${quantityEnabled}-${unitEnabled}` as keyof typeof lineItemLayoutClassNames;
  const layout = lineItemLayoutClassNames[layoutKey];

  function updateLineItem(index: number, patch: Partial<LineItemInput>) {
    onChange(
      lineItems.map((lineItem, candidateIndex) =>
        candidateIndex === index ? { ...lineItem, ...patch } : lineItem,
      ),
    );
  }

  function addLineItem() {
    onChange([
      ...lineItems,
      createEmptyLineItem({
        defaultTaxRate,
        defaultUnit,
      }),
    ]);
  }

  function addSavedLineItem(item: LineItemData) {
    const nextLineItem = createSavedLineItem(item, {
      defaultTaxRate,
      defaultUnit,
      unitEnabled,
    });

    onChange(
      lineItems.length > 0 &&
        isUntouchedStarterLineItem(lineItems[0], {
          defaultTaxRate,
          defaultUnit,
        })
        ? [nextLineItem, ...lineItems.slice(1)]
        : [...lineItems, nextLineItem],
    );
    setPickerOpen(false);
  }

  function removeLineItem(index: number) {
    onChange(lineItems.filter((_, candidateIndex) => candidateIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-stone-200">
        <div
          className={cn(
            "grid gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 max-xl:hidden",
            layout.header,
          )}
        >
          <span>Item</span>
          {quantityEnabled ? <span>Qty</span> : null}
          {unitEnabled ? <span>Unit</span> : null}
          <span>Unit Price</span>
          <span>Discount</span>
          <span>Tax</span>
          <span>Total</span>
          <span />
        </div>
        <div className="divide-y divide-stone-200">
          {lineItems.map((lineItem, index) => {
            const total = calculateLineTotalMinor(lineItem).lineTotalMinor;

            return (
              <div
                className={cn("grid gap-3 p-3 xl:items-start", layout.row)}
                key={index}
              >
                <div className="space-y-2">
                  {getLineItemImageSrc(lineItem) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-24 w-full rounded-md border border-stone-200 object-cover"
                      src={getLineItemImageSrc(lineItem)}
                    />
                  ) : null}
                  <Input
                    aria-label="Line item name"
                    placeholder="Service or product"
                    value={lineItem.name}
                    onChange={(event) =>
                      updateLineItem(index, { name: event.target.value })
                    }
                  />
                  <Textarea
                    aria-label="Line item description"
                    className="min-h-20"
                    placeholder={descriptionPlaceholder}
                    value={lineItem.description}
                    onChange={(event) =>
                      updateLineItem(index, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>
                {quantityEnabled ? (
                  <Input
                    aria-label="Quantity"
                    type="number"
                    min="0"
                    step="0.001"
                    value={lineItem.quantity}
                    onChange={(event) =>
                      updateLineItem(index, {
                        quantity: Number(event.target.value),
                      })
                    }
                  />
                ) : null}
                {unitEnabled ? (
                  <Input
                    aria-label="Unit"
                    list="quote-line-item-unit-options"
                    value={lineItem.unit}
                    onChange={(event) =>
                      updateLineItem(index, {
                        unit: event.target.value,
                      })
                    }
                  />
                ) : null}
                <Input
                  aria-label="Unit price minor"
                  type="number"
                  min="0"
                  value={lineItem.unitPriceMinor}
                  onChange={(event) =>
                    updateLineItem(index, {
                      unitPriceMinor: Number(event.target.value),
                    })
                  }
                />
                <Input
                  aria-label="Discount minor"
                  type="number"
                  min="0"
                  value={lineItem.discountMinor}
                  onChange={(event) =>
                    updateLineItem(index, {
                      discountMinor: Number(event.target.value),
                    })
                  }
                />
                <Input
                  aria-label="Tax rate"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={lineItem.taxRate}
                  onChange={(event) =>
                    updateLineItem(index, {
                      taxRate: Number(event.target.value),
                    })
                  }
                />
                <p className="flex h-10 items-center text-sm font-semibold text-stone-950">
                  {formatMoney(total, currency)}
                </p>
                <Button
                  aria-label="Remove line item"
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      <Button type="button" variant="secondary" onClick={addLineItem}>
        <Plus className="size-4" />
        Add line item
      </Button>
      {lineItemData.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPickerOpen((open) => !open)}
        >
          {pickerOpen ? <X className="size-4" /> : <Database className="size-4" />}
          Add from saved data
        </Button>
      ) : null}
      {unitEnabled ? (
        <datalist id="quote-line-item-unit-options">
          {template.lineItems.unit.options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
      {pickerOpen ? (
        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold text-stone-950">Saved line item data</p>
            <Button
              aria-label="Close saved line item data"
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPickerOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="grid max-h-96 gap-3 overflow-y-auto">
            {lineItemData.map((item) => {
              const imageSrc = getLineItemImageSrc(item);

              return (
                <article
                  className="grid gap-3 rounded-md border border-stone-200 p-3 md:grid-cols-[96px_1fr_auto]"
                  key={item.id}
                >
                  {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-24 w-full rounded-md object-cover"
                      src={imageSrc}
                    />
                  ) : (
                    <div className="hidden h-24 rounded-md border border-dashed border-stone-300 bg-stone-50 md:block" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">{item.title}</p>
                    <p className="mt-1 text-sm font-medium text-stone-600">
                      {item.unit} · {formatMoney(item.unitPriceMinor, currency)}
                    </p>
                    <MarkdownText
                      className="mt-2 line-clamp-3 text-stone-600"
                      value={item.detailedDescription}
                    />
                  </div>
                  <Button
                    className="self-start"
                    type="button"
                    size="sm"
                    onClick={() => addSavedLineItem(item)}
                  >
                    <Plus className="size-4" />
                    Insert
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function createEmptyLineItem(input: {
  defaultTaxRate: number;
  defaultUnit: string;
}): LineItemInput {
  return {
    name: "",
    description: "",
    unit: input.defaultUnit,
    quantity: 1,
    unitPriceMinor: 0,
    discountMinor: 0,
    taxRate: input.defaultTaxRate,
  };
}

function createSavedLineItem(
  item: LineItemData,
  input: {
    defaultTaxRate: number;
    defaultUnit: string;
    unitEnabled: boolean;
  },
): LineItemInput {
  return {
    name: item.title,
    description: item.detailedDescription,
    unit: input.unitEnabled ? item.unit : input.defaultUnit,
    quantity: 1,
    unitPriceMinor: item.unitPriceMinor,
    discountMinor: 0,
    taxRate: input.defaultTaxRate,
    descriptionImageStoragePath: item.descriptionImageStoragePath,
    descriptionImageMimeType: item.descriptionImageMimeType,
    descriptionImageUrl: item.descriptionImageUrl,
  };
}

function isUntouchedStarterLineItem(
  lineItem: LineItemInput,
  input: {
    defaultTaxRate: number;
    defaultUnit: string;
  },
) {
  return (
    lineItem.name.trim() === "" &&
    (lineItem.description ?? "").trim() === "" &&
    lineItem.quantity === 1 &&
    lineItem.unit === input.defaultUnit &&
    lineItem.unitPriceMinor === 0 &&
    lineItem.discountMinor === 0 &&
    lineItem.taxRate === input.defaultTaxRate &&
    !lineItem.descriptionImageStoragePath &&
    !lineItem.descriptionImageMimeType &&
    !lineItem.descriptionImageUrl
  );
}
