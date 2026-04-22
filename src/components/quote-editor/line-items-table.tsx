"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuoteDraft } from "@/lib/quotes/types";
import { formatMoney } from "@/lib/utils";
import { calculateLineTotalMinor } from "@/lib/quotes/calculate-totals";

type LineItemInput = QuoteDraft["lineItems"][number];

export function LineItemsTable({
  lineItems,
  currency,
  onChange,
}: {
  lineItems: LineItemInput[];
  currency: string;
  onChange: (lineItems: LineItemInput[]) => void;
}) {
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
        quantity: 1,
        unitPriceMinor: 0,
        discountMinor: 0,
        taxRate: 0,
      },
    ]);
  }

  function removeLineItem(index: number) {
    onChange(lineItems.filter((_, candidateIndex) => candidateIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-stone-200">
        <div className="grid grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr_0.6fr_0.8fr_44px] gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 max-xl:hidden">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit</span>
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
                className="grid gap-3 p-3 xl:grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr_0.6fr_0.8fr_44px] xl:items-start"
                key={index}
              >
                <div className="space-y-2">
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
                    placeholder="Description"
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
    </div>
  );
}
