"use client";

import {
  Download,
  FileUp,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState, type ChangeEvent, type ReactNode } from "react";

import {
  ImageCropModal,
  imageCropAccept,
  isCroppableImageFile,
  type ImageCropResult,
  type ImageCropSource,
} from "@/components/image-upload/image-crop-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MarkdownFormatHint,
  MarkdownText,
  markdownTextareaPlaceholder,
} from "@/components/ui/markdown-text";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { getLineItemImageSrc } from "@/lib/line-item-data/images";
import type {
  LineItemData,
  LineItemDataDraft,
  LineItemImageMimeType,
} from "@/lib/line-item-data/types";
import {
  normalizeMoneyInput,
  parseNonNegativeDecimalInput,
} from "@/lib/number-inputs";
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

const descriptionImageCropAspectRatio = 4 / 3;
const descriptionImageMaxOutputWidth = 1200;
const descriptionImageMaxOutputHeight = 900;
const csvTemplateUrl =
  "https://docs.google.com/spreadsheets/d/1YvgP4j9-LlWYzDYHr8oA6BVuLbA_dY_WdR0C5It3rY8/edit?usp=sharing";
const maxCsvImportRows = 500;
const csvHeaderLabels = {
  title: "Line Item Title",
  detailedDescription: "Description",
  unit: "Unit",
  unitPrice: "Unit Price",
} as const;
const csvHeaders = {
  title: csvHeaderLabels.title.toLowerCase(),
  detailedDescription: csvHeaderLabels.detailedDescription.toLowerCase(),
  unit: csvHeaderLabels.unit.toLowerCase(),
  unitPrice: csvHeaderLabels.unitPrice.toLowerCase(),
} as const;

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
  const [isImporting, setIsImporting] = useState(false);
  const [imageCropSource, setImageCropSource] =
    useState<ImageCropSource | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const unitSelectOptions = includeCurrentOption(unitOptions, form.unit);
  const isPending =
    isSaving || deletingItemId !== null || isUploading || isImporting;

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm(unitOptions));
    setMessage(null);
    setImportErrors([]);
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

  function selectImageForCrop(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isCroppableImageFile(file)) {
      setMessage("Description picture must be a PNG, JPEG, or WEBP image.");
      return;
    }

    if (imageCropSource) {
      URL.revokeObjectURL(imageCropSource.objectUrl);
    }

    setImageCropSource({
      file,
      objectUrl: URL.createObjectURL(file),
    });
    setMessage(null);
  }

  function clearImageCropSource() {
    if (imageCropSource) {
      URL.revokeObjectURL(imageCropSource.objectUrl);
      setImageCropSource(null);
    }
  }

  async function uploadCroppedImage(result: ImageCropResult) {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", result.file);
      const response = await fetch("/api/line-item-data/image", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Could not upload description picture.",
        );
      }

      updateForm({
        descriptionImageStoragePath: payload.upload.storagePath,
        descriptionImageMimeType: payload.upload.mimeType,
        descriptionImageUrl: payload.upload.url ?? "",
      });
      clearImageCropSource();
      setMessage(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Could not upload description picture.";
      setMessage(errorMessage);
      throw new Error(errorMessage);
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

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage(null);
    setImportErrors([]);

    try {
      const result = csvTextToDrafts(await file.text(), currency);

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setMessage("Fix the CSV errors and upload again.");
        return;
      }

      const response = await fetch("/api/line-item-data/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: result.drafts }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(
          payload.error?.message ?? "Could not import line item data.",
        );
        return;
      }

      const imported = payload.lineItemData as LineItemData[];
      setItems((current) => {
        const importedIds = new Set(imported.map((item) => item.id));
        return [
          ...imported,
          ...current.filter((item) => !importedIds.has(item.id)),
        ].toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setMessage(
        `Imported ${imported.length} line item data ${
          imported.length === 1 ? "row" : "rows"
        }.`,
      );
    } catch {
      setMessage("Could not import line item data.");
    } finally {
      setIsImporting(false);
    }
  }

  const previewImage = getLineItemImageSrc({
    descriptionImageStoragePath: form.descriptionImageStoragePath,
    descriptionImageUrl: form.descriptionImageUrl,
  });

  return (
    <>
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
        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-950">Bulk CSV upload</h2>
          <p className="mt-1 text-sm text-stone-500">
            Import up to {maxCsvImportRows} reusable line items from the CSV
            template.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
              href={csvTemplateUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Download className="size-4" />
              Download CSV template
            </a>
            <label
              aria-busy={isImporting || undefined}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-medium text-white transition hover:bg-stone-800",
                isPending && "pointer-events-none opacity-50",
              )}
            >
              {isImporting ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              {isImporting ? "Importing..." : "Upload CSV"}
              <input
                accept=".csv,text/csv"
                className="sr-only"
                disabled={isPending}
                type="file"
                onChange={(event) => void importCsv(event)}
              />
            </label>
          </div>
          {importErrors.length > 0 ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">CSV import errors</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {importErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

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
                      isPending && "pointer-events-none opacity-50",
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
                      accept={imageCropAccept}
                      className="sr-only"
                      disabled={isPending}
                      type="file"
                      onChange={selectImageForCrop}
                    />
                  </label>
                  {previewImage ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
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
                placeholder={markdownTextareaPlaceholder}
                value={form.detailedDescription}
                onChange={(event) =>
                  updateForm({ detailedDescription: event.target.value })
                }
              />
              <MarkdownFormatHint />
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
      {imageCropSource ? (
        <ImageCropModal
          key={imageCropSource.objectUrl}
          aspectRatio={descriptionImageCropAspectRatio}
          file={imageCropSource.file}
          maxOutputHeight={descriptionImageMaxOutputHeight}
          maxOutputWidth={descriptionImageMaxOutputWidth}
          objectUrl={imageCropSource.objectUrl}
          open
          title="Crop description picture"
          onCancel={clearImageCropSource}
          onConfirm={uploadCroppedImage}
        />
      ) : null}
    </>
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

type CsvRecord = {
  rowNumber: number;
  cells: string[];
};

function csvTextToDrafts(
  text: string,
  currency: string,
): { drafts: LineItemDataDraft[]; errors: string[] } {
  const parsed = parseCsv(text);

  if (parsed.error) {
    return { drafts: [], errors: [parsed.error] };
  }

  const records = parsed.records.filter((record) => !isEmptyCsvRow(record));
  const header = records[0];

  if (!header) {
    return {
      drafts: [],
      errors: ["CSV must include a header row and at least one line item row."],
    };
  }

  const headerLookup = new Map(
    header.cells.map((cell, index) => [normalizeCsvHeader(cell), index]),
  );
  const missingHeaders = Object.entries(csvHeaders)
    .filter(([, normalizedHeader]) => !headerLookup.has(normalizedHeader))
    .map(([field]) => csvHeaderLabels[field as keyof typeof csvHeaderLabels]);

  if (missingHeaders.length > 0) {
    return {
      drafts: [],
      errors: [`Missing required CSV columns: ${missingHeaders.join(", ")}.`],
    };
  }

  const dataRecords = records.slice(1);

  if (dataRecords.length === 0) {
    return {
      drafts: [],
      errors: ["CSV must include at least one line item row."],
    };
  }

  if (dataRecords.length > maxCsvImportRows) {
    return {
      drafts: [],
      errors: [`CSV imports are limited to ${maxCsvImportRows} line item rows.`],
    };
  }

  const indexes = {
    title: headerLookup.get(csvHeaders.title) ?? -1,
    detailedDescription: headerLookup.get(csvHeaders.detailedDescription) ?? -1,
    unit: headerLookup.get(csvHeaders.unit) ?? -1,
    unitPrice: headerLookup.get(csvHeaders.unitPrice) ?? -1,
  };
  const drafts: LineItemDataDraft[] = [];
  const errors: string[] = [];

  for (const record of dataRecords) {
    const title = getCsvCell(record, indexes.title).trim();
    const detailedDescription = getCsvCell(
      record,
      indexes.detailedDescription,
    ).trim();
    const unit = getCsvCell(record, indexes.unit).trim();
    const unitPriceText = getCsvCell(record, indexes.unitPrice).trim();
    const unitPrice = unitPriceText
      ? parseNonNegativeDecimalInput(unitPriceText)
      : 0;
    const rowErrors: string[] = [];

    if (!title) {
      rowErrors.push(`${csvHeaderLabels.title} is required`);
    } else if (title.length > 200) {
      rowErrors.push(`${csvHeaderLabels.title} must be 200 characters or fewer`);
    }

    if (detailedDescription.length > 10000) {
      rowErrors.push(
        `${csvHeaderLabels.detailedDescription} must be 10000 characters or fewer`,
      );
    }

    if (!unit) {
      rowErrors.push(`${csvHeaderLabels.unit} is required`);
    } else if (unit.length > 40) {
      rowErrors.push(`${csvHeaderLabels.unit} must be 40 characters or fewer`);
    }

    if (unitPrice === null) {
      rowErrors.push(
        `${csvHeaderLabels.unitPrice} must be a non-negative number`,
      );
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${record.rowNumber}: ${rowErrors.join("; ")}.`);
      continue;
    }

    drafts.push({
      title,
      detailedDescription,
      unit,
      unitPriceMinor: majorToMinor(String(unitPrice), currency),
    });
  }

  return { drafts: errors.length > 0 ? [] : drafts, errors };
}

function parseCsv(text: string): { records: CsvRecord[]; error?: string } {
  const records: CsvRecord[] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowNumber = 1;
  let currentRowNumber = 1;

  function finishField() {
    row.push(field);
    field = "";
  }

  function finishRow() {
    finishField();
    records.push({ rowNumber: currentRowNumber, cells: row });
    row = [];
    currentRowNumber = rowNumber + 1;
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === "\"") {
        if (nextChar === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else if (char === "\r" || char === "\n") {
        field += "\n";
        if (char === "\r" && nextChar === "\n") {
          index += 1;
        }
        rowNumber += 1;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"" && field.length === 0) {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      finishField();
      continue;
    }

    if (char === "\r" || char === "\n") {
      finishRow();
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      rowNumber += 1;
      currentRowNumber = rowNumber;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    return {
      records: [],
      error: `Row ${currentRowNumber}: quoted CSV field is not closed.`,
    };
  }

  finishRow();

  return { records };
}

function isEmptyCsvRow(record: CsvRecord) {
  return record.cells.every((cell) => cell.trim() === "");
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase();
}

function getCsvCell(record: CsvRecord, index: number) {
  return index >= 0 ? record.cells[index] ?? "" : "";
}
