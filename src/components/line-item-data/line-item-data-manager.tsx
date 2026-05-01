"use client";

import {
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState, type ChangeEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownText } from "@/components/ui/markdown-text";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { getLineItemImageSrc } from "@/lib/line-item-data/images";
import type {
  LineItemData,
  LineItemDataDraft,
  LineItemImageMimeType,
} from "@/lib/line-item-data/types";
import { normalizeMoneyInput } from "@/lib/number-inputs";
import { cn, formatMoney, majorToMinor, minorToMajorString } from "@/lib/utils";

type FormState = {
  title: string;
  detailedDescription: string;
  unit: string;
  unitPriceMajor: string;
  descriptionImageStoragePath: string;
  descriptionImageMimeType?: LineItemImageMimeType;
  descriptionImageUrl: string;
};

const selectClassName =
  "h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-100";

export function LineItemDataManager({
  initialItems,
  currency,
  unitOptions,
}: {
  initialItems: LineItemData[];
  currency: string;
  unitOptions: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState<FormState>(() =>
    createEmptyForm(unitOptions),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const unitSelectOptions = includeCurrentOption(unitOptions, form.unit);
  const isPending = isSaving || deletingItemId !== null || isUploading;

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm(unitOptions));
    setMessage(null);
  }

  function editItem(item: LineItemData) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      detailedDescription: item.detailedDescription,
      unit: item.unit,
      unitPriceMajor: minorToMajorString(item.unitPriceMinor, currency),
      descriptionImageStoragePath: item.descriptionImageStoragePath ?? "",
      descriptionImageMimeType: item.descriptionImageMimeType,
      descriptionImageUrl: getLineItemImageSrc(item) ?? "",
    });
    setMessage(null);
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/line-item-data/image", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(
          payload.error?.message ?? "Could not upload description picture.",
        );
        return;
      }

      updateForm({
        descriptionImageStoragePath: payload.upload.storagePath,
        descriptionImageMimeType: payload.upload.mimeType,
        descriptionImageUrl: payload.upload.url ?? "",
      });
      setMessage(null);
    } catch {
      setMessage("Could not upload description picture.");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveItem() {
    setMessage(null);

    const draft = toDraft(form, currency);
    const response = await fetch(
      editingId ? `/api/line-item-data/${editingId}` : "/api/line-item-data",
      {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not save line item data.");
      return;
    }

    const saved = payload.lineItemData as LineItemData;
    setItems((current) => {
      const withoutSaved = current.filter((item) => item.id !== saved.id);
      return [saved, ...withoutSaved].toSorted((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    });
    setEditingId(null);
    setForm(createEmptyForm(unitOptions));
    setMessage("Line item data saved.");
  }

  async function deleteItem(item: LineItemData) {
    const response = await fetch(`/api/line-item-data/${item.id}`, {
      method: "DELETE",
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not delete line item data.");
      return;
    }

    setItems((current) => current.filter((candidate) => candidate.id !== item.id));

    if (editingId === item.id) {
      resetForm();
    }

    setMessage("Line item data deleted.");
  }

  async function handleSaveItem() {
    setIsSaving(true);

    try {
      await saveItem();
    } catch {
      setMessage("Could not save line item data.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteItem(item: LineItemData) {
    setDeletingItemId(item.id);

    try {
      await deleteItem(item);
    } catch {
      setMessage("Could not delete line item data.");
    } finally {
      setDeletingItemId(null);
    }
  }

  const previewImage = getLineItemImageSrc({
    descriptionImageStoragePath: form.descriptionImageStoragePath,
    descriptionImageUrl: form.descriptionImageUrl,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="font-semibold text-stone-950">No saved line item data</p>
            <p className="mt-2 text-sm text-stone-500">
              Create reusable items that can be inserted into new quotations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const imageSrc = getLineItemImageSrc(item);

              return (
                <article
                  className="rounded-lg border border-stone-200 bg-white p-4"
                  key={item.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-stone-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-medium text-stone-600">
                        {item.unit} · {formatMoney(item.unitPriceMinor, currency)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => editItem(item)}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={isPending}
                        loading={deletingItemId === item.id}
                        loadingText="Deleting..."
                        onClick={() => void handleDeleteItem(item)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="h-32 w-full rounded-md border border-stone-200 object-cover"
                        src={imageSrc}
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                        No picture
                      </div>
                    )}
                    <MarkdownText
                      className="text-stone-600"
                      value={item.detailedDescription}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <form
          className="sticky top-6 rounded-lg border border-stone-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveItem();
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-stone-950">
              {editingId ? "Edit Line Item Data" : "New Line Item Data"}
            </h2>
            {editingId ? (
              <Button
                aria-label="Cancel edit"
                type="button"
                variant="ghost"
                size="icon"
                onClick={resetForm}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="space-y-4">
            <Field label="Line Item Title">
              <Input
                required
                value={form.title}
                onChange={(event) => updateForm({ title: event.target.value })}
              />
            </Field>
            <Field label="Description Picture">
              <div className="space-y-3">
                {previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-36 w-full rounded-md border border-stone-200 object-cover"
                    src={previewImage}
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                    No picture
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <label
                    aria-busy={isUploading || undefined}
                    className={cn(
                      "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900 transition hover:bg-stone-100",
                      isUploading && "pointer-events-none opacity-50",
                    )}
                  >
                    {isUploading ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    {isUploading ? "Uploading..." : "Upload"}
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={isUploading}
                      type="file"
                      onChange={(event) => void uploadImage(event)}
                    />
                  </label>
                  {previewImage ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updateForm({
                          descriptionImageStoragePath: "",
                          descriptionImageMimeType: undefined,
                          descriptionImageUrl: "",
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </Field>
            <Field label="Detailed Description">
              <Textarea
                required
                className="min-h-40"
                value={form.detailedDescription}
                onChange={(event) =>
                  updateForm({ detailedDescription: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Unit">
                <select
                  required
                  className={selectClassName}
                  value={form.unit}
                  onChange={(event) => updateForm({ unit: event.target.value })}
                >
                  {unitSelectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Unit Price">
                <NumericInput
                  required
                  inputMode="decimal"
                  value={form.unitPriceMajor}
                  normalizeValue={(value) => normalizeMoneyInput(value, currency)}
                  onValueChange={(value) =>
                    updateForm({ unitPriceMajor: value })
                  }
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              disabled={isPending}
              loading={isSaving}
              loadingText={editingId ? "Saving..." : "Creating..."}
            >
              {editingId ? <Save className="size-4" /> : <Plus className="size-4" />}
              {editingId ? "Save changes" : "Create item"}
            </Button>
            {message ? (
              <p className="text-sm font-medium text-stone-600">{message}</p>
            ) : null}
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function createEmptyForm(unitOptions: string[]): FormState {
  return {
    title: "",
    detailedDescription: "",
    unit: getDefaultUnit(unitOptions),
    unitPriceMajor: "0.00",
    descriptionImageStoragePath: "",
    descriptionImageMimeType: undefined,
    descriptionImageUrl: "",
  };
}

function getDefaultUnit(unitOptions: string[]) {
  return unitOptions.find((option) => option.trim()) ?? "Unit";
}

function includeCurrentOption(options: string[], currentValue: string) {
  const normalizedCurrentValue = currentValue.trim();
  const normalizedOptions = options.filter((option) => option.trim());

  if (
    !normalizedCurrentValue ||
    normalizedOptions.some((option) => option === normalizedCurrentValue)
  ) {
    return normalizedOptions.length > 0 ? normalizedOptions : ["Unit"];
  }

  return [normalizedCurrentValue, ...normalizedOptions];
}

function toDraft(form: FormState, currency: string): LineItemDataDraft {
  return {
    title: form.title,
    detailedDescription: form.detailedDescription,
    unit: form.unit,
    unitPriceMinor: majorToMinor(form.unitPriceMajor, currency),
    descriptionImageStoragePath: form.descriptionImageStoragePath || undefined,
    descriptionImageMimeType: form.descriptionImageMimeType,
  };
}
