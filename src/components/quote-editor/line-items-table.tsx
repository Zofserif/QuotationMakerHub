"use client";

import { Database, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useState, type ChangeEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownText } from "@/components/ui/markdown-text";
import { Textarea } from "@/components/ui/textarea";
import { getCurrencyInputStep } from "@/lib/currency";
import { getLineItemImageSrc } from "@/lib/line-item-data/images";
import type { LineItemData } from "@/lib/line-item-data/types";
import {
  getTemplateDefaultLineItemTaxRate,
  getTemplateDefaultLineItemUnit,
} from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { QuoteDraft } from "@/lib/quotes/types";
import { calculateLineTotalMinor } from "@/lib/quotes/calculate-totals";
import { cn, formatMoney, majorToMinor, minorToMajorString } from "@/lib/utils";

type LineItemInput = QuoteDraft["lineItems"][number];

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
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const quantityEnabled = template.lineItems.showQuantity;
  const unitEnabled = template.lineItems.unit.enabled;
  const vatEnabled = template.lineItems.vat.enabled;
  const defaultUnit = getTemplateDefaultLineItemUnit(template);
  const defaultTaxRate = getTemplateDefaultLineItemTaxRate(template);
  const taxMode = vatEnabled ? template.lineItems.vat.mode : "exclusive";
  const moneyDisplay = template.lineItems.unitPrice.display;
  const unitPriceStep = getCurrencyInputStep(currency);
  const descriptionPlaceholder =
    template.lineItems.detailedDescriptionLabel.trim() ||
    "Detailed description markdown";

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

  async function uploadImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadingIndex(index);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/line-item-data/image", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        return;
      }

      updateLineItem(index, {
        descriptionImageStoragePath: payload.upload.storagePath,
        descriptionImageMimeType: payload.upload.mimeType,
        descriptionImageUrl: payload.upload.url ?? "",
      });
    } finally {
      setUploadingIndex(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {lineItems.map((lineItem, index) => {
          const total = calculateLineTotalMinor({
            ...lineItem,
            taxRate: vatEnabled ? lineItem.taxRate : 0,
            taxMode,
          }).lineTotalMinor;
          const lineSubtotalMinor = calculateLineSubtotalMinor(lineItem);
          const discountPercent = discountPercentFromMinor(
            lineItem.discountMinor,
            lineSubtotalMinor,
          );
          const imageSrc = getLineItemImageSrc(lineItem);
          const isUploadingImage = uploadingIndex === index;
          const currentUnit = lineItem.unit || defaultUnit;
          const unitOptions = includeCurrentOption(
            template.lineItems.unit.options,
            currentUnit,
          );

          return (
            <article
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              key={index}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                    {template.lineItems.showItemNumber
                      ? `Item ${index + 1}`
                      : `Line item ${index + 1}`}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    VAT {vatEnabled
                      ? `${Math.round(lineItem.taxRate * 10000) / 100}% ${taxMode === "inclusive" ? "included" : "added"}`
                      : "off"}
                  </p>
                </div>
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

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_100px_110px_130px_120px_140px]">
                <div className="space-y-3">
                  {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-36 w-full rounded-md border border-stone-200 object-cover"
                      src={imageSrc}
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-stone-300 bg-white text-sm text-stone-500">
                      No picture
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <label
                      aria-busy={isUploadingImage || undefined}
                      className={cn(
                        "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900 transition hover:bg-stone-100",
                        uploadingIndex !== null && "pointer-events-none opacity-50",
                      )}
                    >
                      {isUploadingImage ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                      ) : (
                        <ImagePlus className="size-4" />
                      )}
                      {isUploadingImage ? "Uploading..." : "Upload picture"}
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingIndex !== null}
                        type="file"
                        onChange={(event) => void uploadImage(index, event)}
                      />
                    </label>
                    {imageSrc ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateLineItem(index, {
                            descriptionImageStoragePath: "",
                            descriptionImageMimeType: undefined,
                            descriptionImageUrl: "",
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                        Remove picture
                      </Button>
                    ) : null}
                  </div>

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
                    className="min-h-32 bg-white"
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
                  <Field label="Quantity">
                    <Input
                      aria-label="Quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={String(lineItem.quantity)}
                      onChange={(event) => {
                        const quantity = Math.max(1, Number(event.target.value || 1));

                        updateLineItem(index, {
                          quantity,
                          discountMinor: discountMinorFromPercent(
                            discountPercent,
                            calculateLineSubtotalMinor({
                              ...lineItem,
                              quantity,
                            }),
                          ),
                        });
                      }}
                    />
                  </Field>
                ) : (
                  <div />
                )}

                {unitEnabled ? (
                  <Field label="Unit">
                    <select
                      aria-label="Unit"
                      className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-100"
                      value={currentUnit}
                      onChange={(event) =>
                        updateLineItem(index, { unit: event.target.value })
                      }
                    >
                      {unitOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div />
                )}

                <Field label="Unit Price">
                  <Input
                    aria-label="Unit price"
                    type="number"
                    min="0"
                    step={unitPriceStep}
                    value={minorToMajorString(lineItem.unitPriceMinor, currency)}
                    onChange={(event) => {
                      const unitPriceMinor = majorToMinor(event.target.value, currency);

                      updateLineItem(index, {
                        unitPriceMinor,
                        discountMinor: discountMinorFromPercent(
                          discountPercent,
                          calculateLineSubtotalMinor({
                            ...lineItem,
                            unitPriceMinor,
                          }),
                        ),
                      });
                    }}
                  />
                </Field>

                <Field label="Discount %">
                  <Input
                    aria-label="Discount percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formatDiscountPercent(discountPercent)}
                    onChange={(event) =>
                      updateLineItem(index, {
                        discountMinor: discountMinorFromPercent(
                          event.target.value,
                          lineSubtotalMinor,
                        ),
                      })
                    }
                  />
                </Field>

                <div className="space-y-3">
                  {vatEnabled && taxMode === "exclusive" ? (
                    <Field label="VAT">
                      <div className="flex h-10 items-center rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-600">
                        {Math.round(lineItem.taxRate * 10000) / 100}% excl.
                      </div>
                    </Field>
                  ) : null}
                  <div className="rounded-md border border-stone-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Line Total
                    </p>
                    <p className="mt-2 text-lg font-semibold text-stone-950">
                      {formatMoney(total, currency, moneyDisplay)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
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
      </div>

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
                  className={cn(
                    "grid gap-3 rounded-md border border-stone-200 p-3",
                    "md:grid-cols-[96px_minmax(0,1fr)_auto]",
                  )}
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
                      {item.unit} · {formatMoney(item.unitPriceMinor, currency, moneyDisplay)}
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

function calculateLineSubtotalMinor(
  lineItem: Pick<LineItemInput, "quantity" | "unitPriceMinor">,
) {
  return Math.round(lineItem.quantity * lineItem.unitPriceMinor);
}

function discountPercentFromMinor(discountMinor: number, lineSubtotalMinor: number) {
  if (lineSubtotalMinor <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (discountMinor / lineSubtotalMinor) * 100));
}

function discountMinorFromPercent(
  value: number | string,
  lineSubtotalMinor: number,
) {
  const percent = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(percent) || lineSubtotalMinor <= 0) {
    return 0;
  }

  const clampedPercent = Math.min(100, Math.max(0, percent));

  return Math.round(lineSubtotalMinor * (clampedPercent / 100));
}

function formatDiscountPercent(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
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

function includeCurrentOption(options: string[], currentValue: string) {
  const normalizedCurrentValue = currentValue.trim();

  if (
    !normalizedCurrentValue ||
    options.some((option) => option === normalizedCurrentValue)
  ) {
    return options;
  }

  return [normalizedCurrentValue, ...options];
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      {children}
    </label>
  );
}
