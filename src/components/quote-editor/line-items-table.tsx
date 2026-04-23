"use client";

import { Database, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownText } from "@/components/ui/markdown-text";
import { Textarea } from "@/components/ui/textarea";
import { getLineItemImageSrc } from "@/lib/line-item-data/images";
import type { LineItemData } from "@/lib/line-item-data/types";
import type { QuoteDraft } from "@/lib/quotes/types";
import { formatMoney } from "@/lib/utils";
import { calculateLineTotalMinor } from "@/lib/quotes/calculate-totals";

type LineItemInput = QuoteDraft["lineItems"][number];

export function LineItemsTable({
  lineItems,
  currency,
  lineItemData = [],
  defaultTaxRate = 0,
  onChange,
}: {
  lineItems: LineItemInput[];
  currency: string;
  lineItemData?: LineItemData[];
  defaultTaxRate?: number;
  onChange: (lineItems: LineItemInput[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

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
      {
        name: "",
        description: "",
        unit: "Unit",
        quantity: 1,
        unitPriceMinor: 0,
        discountMinor: 0,
        taxRate: defaultTaxRate,
      },
    ]);
  }

  function addSavedLineItem(item: LineItemData) {
    onChange([
      ...lineItems,
      {
        name: item.title,
        description: item.detailedDescription,
        unit: item.unit,
        quantity: 1,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: 0,
        taxRate: defaultTaxRate,
        descriptionImageStoragePath: item.descriptionImageStoragePath,
        descriptionImageMimeType: item.descriptionImageMimeType,
        descriptionImageUrl: item.descriptionImageUrl,
      },
    ]);
    setPickerOpen(false);
  }

  function removeLineItem(index: number) {
    onChange(lineItems.filter((_, candidateIndex) => candidateIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-stone-200">
        <div className="grid grid-cols-[1.5fr_0.45fr_0.55fr_0.75fr_0.75fr_0.55fr_0.8fr_44px] gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 max-xl:hidden">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit</span>
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
                className="grid gap-3 p-3 xl:grid-cols-[1.5fr_0.45fr_0.55fr_0.75fr_0.75fr_0.55fr_0.8fr_44px] xl:items-start"
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
                    placeholder="Detailed description markdown"
                    value={lineItem.description}
                    onChange={(event) =>
                      updateLineItem(index, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>
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
                <Input
                  aria-label="Unit"
                  value={lineItem.unit}
                  onChange={(event) =>
                    updateLineItem(index, {
                      unit: event.target.value,
                    })
                  }
                />
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
