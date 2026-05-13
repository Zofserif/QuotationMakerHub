"use client";

import {
  ChevronDown,
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
import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

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
import {
  dedupeLineItemDataDraftsByTitle,
  defaultLineItemUnit,
} from "@/lib/line-item-data/matching";
import type {
  LineItemData,
  LineItemDataDraft,
  LineItemImageMimeType,
} from "@/lib/line-item-data/types";
import {
  normalizeMoneyInput,
  parseNonNegativeDecimalInput,
} from "@/lib/number-inputs";
import { cn, majorToMinor, minorToMajorString } from "@/lib/utils";

type FormState = {
  title: string;
  detailedDescription: string;
  unit: string;
  unitPriceMajor: string;
  descriptionImageStoragePath: string;
  descriptionImageMimeType?: LineItemImageMimeType;
  descriptionImageUrl: string;
};
type FormTarget = "create" | "edit";
type SavingForm = FormTarget | null;
type EditDraft = {
  itemId: string;
  form: FormState;
};
type ImageCropState = ImageCropSource & {
  target: FormTarget;
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
const requiredCsvHeaders = {
  title: csvHeaders.title,
  unit: csvHeaders.unit,
  unitPrice: csvHeaders.unitPrice,
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
  const [createForm, setCreateForm] = useState<FormState>(() =>
    createEmptyForm(unitOptions),
  );
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState<SavingForm>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [unitPriceDrafts, setUnitPriceDrafts] = useState<
    Record<string, string>
  >({});
  const [unitPriceErrors, setUnitPriceErrors] = useState<
    Record<string, string>
  >({});
  const [savingUnitPriceId, setSavingUnitPriceId] = useState<string | null>(
    null,
  );
  const [imageCropSource, setImageCropSource] =
    useState<ImageCropState | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const isPending =
    savingForm !== null ||
    deletingItemId !== null ||
    isUploading ||
    isImporting ||
    savingUnitPriceId !== null;

  function updateCreateForm(patch: Partial<FormState>) {
    setCreateForm((current) => ({ ...current, ...patch }));
  }

  function updateEditForm(patch: Partial<FormState>) {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            form: {
              ...current.form,
              ...patch,
            },
          }
        : current,
    );
  }

  function updateTargetForm(target: FormTarget, patch: Partial<FormState>) {
    if (target === "create") {
      updateCreateForm(patch);
      return;
    }

    updateEditForm(patch);
  }

  function editItem(item: LineItemData) {
    setEditDraft({
      itemId: item.id,
      form: lineItemDataToForm(item, currency),
    });
    setMessage(null);
  }

  function closeEditModal() {
    setEditDraft(null);
    setMessage(null);
  }

  function toggleItemDetails(itemId: string) {
    setExpandedItemIds((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  function updateUnitPriceDraft(itemId: string, value: string) {
    setUnitPriceDrafts((current) => ({ ...current, [itemId]: value }));
    setUnitPriceErrors((current) => removeRecordKey(current, itemId));
  }

  function selectImageForCrop(
    event: ChangeEvent<HTMLInputElement>,
    target: FormTarget,
  ) {
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
      target,
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
    const cropTarget = imageCropSource?.target;

    if (!cropTarget) {
      return;
    }

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

      updateTargetForm(cropTarget, {
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

  async function saveItem({
    form,
    itemId,
  }: {
    form: FormState;
    itemId?: string;
  }) {
    setMessage(null);

    const draft = toDraft(form, currency);
    const response = await fetch(
      itemId ? `/api/line-item-data/${itemId}` : "/api/line-item-data",
      {
        method: itemId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not save line item data.");
      return false;
    }

    const saved = payload.lineItemData as LineItemData;
    setItems((current) => {
      const withoutSaved = current.filter((item) => item.id !== saved.id);
      return [saved, ...withoutSaved].toSorted((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    });
    setUnitPriceDrafts((current) => removeRecordKey(current, saved.id));
    setUnitPriceErrors((current) => removeRecordKey(current, saved.id));
    setMessage("Line item data saved.");

    return true;
  }

  async function saveUnitPrice(item: LineItemData) {
    if (isPending) {
      return;
    }

    const unitPriceDraft =
      unitPriceDrafts[item.id] ??
      minorToMajorString(item.unitPriceMinor, currency);
    const parsedUnitPrice = parseNonNegativeDecimalInput(unitPriceDraft);

    if (parsedUnitPrice === null) {
      setUnitPriceErrors((current) => ({
        ...current,
        [item.id]: "Unit price must be a non-negative number.",
      }));
      return;
    }

    const unitPriceMinor = majorToMinor(String(parsedUnitPrice), currency);

    if (unitPriceMinor === item.unitPriceMinor) {
      setUnitPriceDrafts((current) => removeRecordKey(current, item.id));
      setUnitPriceErrors((current) => removeRecordKey(current, item.id));
      return;
    }

    setSavingUnitPriceId(item.id);
    setUnitPriceErrors((current) => removeRecordKey(current, item.id));

    try {
      const response = await fetch(`/api/line-item-data/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          toLineItemDataDraft(item, {
            unitPriceMinor,
          }),
        ),
      });
      const payload = await response.json();

      if (!response.ok) {
        setUnitPriceErrors((current) => ({
          ...current,
          [item.id]: payload.error?.message ?? "Could not save unit price.",
        }));
        return;
      }

      const saved = payload.lineItemData as LineItemData;

      setItems((current) => {
        const withoutSaved = current.filter(
          (candidate) => candidate.id !== saved.id,
        );
        return [saved, ...withoutSaved].toSorted((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
      });
      setUnitPriceDrafts((current) => removeRecordKey(current, item.id));
      setUnitPriceErrors((current) => removeRecordKey(current, item.id));
    } catch {
      setUnitPriceErrors((current) => ({
        ...current,
        [item.id]: "Could not save unit price.",
      }));
    } finally {
      setSavingUnitPriceId(null);
    }
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
    setExpandedItemIds((current) => removeSetValue(current, item.id));
    setUnitPriceDrafts((current) => removeRecordKey(current, item.id));
    setUnitPriceErrors((current) => removeRecordKey(current, item.id));

    if (editDraft?.itemId === item.id) {
      closeEditModal();
    }

    setMessage("Line item data deleted.");
  }

  async function handleCreateItem() {
    setSavingForm("create");

    try {
      const saved = await saveItem({ form: createForm });

      if (saved) {
        setCreateForm(createEmptyForm(unitOptions));
      }
    } catch {
      setMessage("Could not save line item data.");
    } finally {
      setSavingForm(null);
    }
  }

  async function handleSaveEdit() {
    if (!editDraft) {
      return;
    }

    setSavingForm("edit");

    try {
      const saved = await saveItem({
        form: editDraft.form,
        itemId: editDraft.itemId,
      });

      if (saved) {
        setEditDraft(null);
      }
    } catch {
      setMessage("Could not save line item data.");
    } finally {
      setSavingForm(null);
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
      const importedById = new Map(imported.map((item) => [item.id, item]));
      setItems((current) => {
        return [
          ...imported,
          ...current.filter((item) => !importedById.has(item.id)),
        ].toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setUnitPriceDrafts((current) =>
        removeRecordKeys(current, importedById.keys()),
      );
      setUnitPriceErrors((current) =>
        removeRecordKeys(current, importedById.keys()),
      );

      if (editDraft) {
        const importedEditingItem = importedById.get(editDraft.itemId);

        if (importedEditingItem) {
          setEditDraft((current) =>
            current?.itemId === importedEditingItem.id
              ? {
                  ...current,
                  form: {
                    ...current.form,
                    unitPriceMajor: minorToMajorString(
                      importedEditingItem.unitPriceMinor,
                      currency,
                    ),
                  },
                }
              : current,
          );
        }
      }

      setMessage(
        `Processed ${imported.length} line item data ${
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
    descriptionImageStoragePath: createForm.descriptionImageStoragePath,
    descriptionImageUrl: createForm.descriptionImageUrl,
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
              const detailsOpen = expandedItemIds.has(item.id);
              const detailsId = `line-item-data-details-${item.id}`;
              const unitPriceDraftExists = hasRecordKey(
                unitPriceDrafts,
                item.id,
              );
              const unitPriceDraft = unitPriceDraftExists
                ? unitPriceDrafts[item.id]
                : minorToMajorString(item.unitPriceMinor, currency);
              const parsedUnitPrice =
                parseNonNegativeDecimalInput(unitPriceDraft);
              const unitPriceMinor =
                parsedUnitPrice === null
                  ? null
                  : majorToMinor(String(parsedUnitPrice), currency);
              const unitPriceChanged =
                unitPriceMinor !== null &&
                unitPriceMinor !== item.unitPriceMinor;
              const unitPriceError =
                unitPriceErrors[item.id] ??
                (unitPriceDraftExists && parsedUnitPrice === null
                  ? "Unit price must be a non-negative number."
                  : null);
              const isSavingUnitPrice = savingUnitPriceId === item.id;

              return (
                <article
                  className="rounded-lg border border-stone-200 bg-white p-4"
                  key={item.id}
                >
                  <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_auto] lg:items-start">
                    <div className="min-w-0">
                      <p className="break-words text-lg font-semibold text-stone-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-medium text-stone-600">
                        Unit: {item.unit}
                      </p>
                    </div>

                    <form
                      className="min-w-0"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveUnitPrice(item);
                      }}
                    >
                      <Label htmlFor={`unit-price-${item.id}`}>Unit Price</Label>
                      <div className="mt-2 flex min-w-0 max-w-full flex-wrap items-start gap-2">
                        <NumericInput
                          required
                          className="w-36 max-w-full"
                          disabled={isPending}
                          id={`unit-price-${item.id}`}
                          inputMode="decimal"
                          value={unitPriceDraft}
                          normalizeValue={(value) =>
                            normalizeMoneyInput(value, currency)
                          }
                          onValueChange={(value) =>
                            updateUnitPriceDraft(item.id, value)
                          }
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          disabled={
                            !unitPriceChanged ||
                            unitPriceMinor === null ||
                            (isPending && !isSavingUnitPrice)
                          }
                          loading={isSavingUnitPrice}
                          loadingText="Saving..."
                        >
                          <Save className="size-4" />
                          Save
                        </Button>
                      </div>
                      {unitPriceError ? (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {unitPriceError}
                        </p>
                      ) : null}
                    </form>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <Button
                        aria-controls={detailsId}
                        aria-expanded={detailsOpen}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleItemDetails(item.id)}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            detailsOpen && "rotate-180",
                          )}
                        />
                        Details
                      </Button>
                      <Button
                        aria-haspopup="dialog"
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
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

                  {detailsOpen ? (
                    <div
                      className="mt-4 grid gap-4 border-t border-stone-200 pt-4 md:grid-cols-[160px_minmax(0,1fr)]"
                      id={detailsId}
                    >
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
                      <div className="min-w-0">
                        {item.detailedDescription.trim() ? (
                          <MarkdownText
                            className="text-stone-600"
                            value={item.detailedDescription}
                          />
                        ) : (
                          <p className="text-sm text-stone-500">No details</p>
                        )}
                      </div>
                    </div>
                  ) : null}
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
            void handleCreateItem();
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-stone-950">New Line Item Data</h2>
          </div>

          <LineItemDataFormFields
            currency={currency}
            disabled={isPending}
            form={createForm}
            isUploading={isUploading && imageCropSource?.target === "create"}
            previewImage={previewImage}
            unitOptions={unitOptions}
            onChange={updateCreateForm}
            onSelectImage={(event) => selectImageForCrop(event, "create")}
          />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              disabled={isPending}
              loading={savingForm === "create"}
              loadingText="Creating..."
            >
              <Plus className="size-4" />
              Create item
            </Button>
            {message ? (
              <p className="text-sm font-medium text-stone-600">{message}</p>
            ) : null}
          </div>
        </form>
      </aside>
      </div>
      {editDraft ? (
        <LineItemDataEditModal
          currency={currency}
          draft={editDraft}
          disabled={isPending || imageCropSource?.target === "edit"}
          isSaving={savingForm === "edit"}
          isUploading={isUploading && imageCropSource?.target === "edit"}
          message={message}
          unitOptions={unitOptions}
          onChange={updateEditForm}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
          onSelectImage={(event) => selectImageForCrop(event, "edit")}
        />
      ) : null}
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

function LineItemDataEditModal({
  currency,
  disabled,
  draft,
  isSaving,
  isUploading,
  message,
  onChange,
  onClose,
  onSave,
  onSelectImage,
  unitOptions,
}: {
  currency: string;
  disabled: boolean;
  draft: EditDraft;
  isSaving: boolean;
  isUploading: boolean;
  message: string | null;
  onChange: (patch: Partial<FormState>) => void;
  onClose: () => void;
  onSave: () => void;
  onSelectImage: (event: ChangeEvent<HTMLInputElement>) => void;
  unitOptions: string[];
}) {
  const titleId = useId();
  const descriptionId = useId();
  const previewImage = getLineItemImageSrc({
    descriptionImageStoragePath: draft.form.descriptionImageStoragePath,
    descriptionImageUrl: draft.form.descriptionImageUrl,
  });

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !disabled) {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [disabled, onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-stone-950" id={titleId}>
              Edit Line Item Data
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-500" id={descriptionId}>
              Update this reusable line item.
            </p>
          </div>
          <Button
            aria-label="Close line item data editor"
            disabled={disabled}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <div className="space-y-4 p-5">
            <LineItemDataFormFields
              currency={currency}
              disabled={disabled}
              form={draft.form}
              isUploading={isUploading}
              previewImage={previewImage}
              unitOptions={unitOptions}
              onChange={onChange}
              onSelectImage={onSelectImage}
            />
          </div>

          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 px-5 py-4">
            {message ? (
              <p className="min-w-0 flex-1 text-sm font-medium text-stone-600">
                {message}
              </p>
            ) : null}
            <Button
              disabled={disabled}
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              disabled={disabled}
              loading={isSaving}
              loadingText="Saving..."
              type="submit"
            >
              <Save className="size-4" />
              Save changes
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function LineItemDataFormFields({
  currency,
  disabled,
  form,
  isUploading,
  onChange,
  onSelectImage,
  previewImage,
  unitOptions,
}: {
  currency: string;
  disabled: boolean;
  form: FormState;
  isUploading: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onSelectImage: (event: ChangeEvent<HTMLInputElement>) => void;
  previewImage?: string;
  unitOptions: string[];
}) {
  const unitSelectOptions = includeCurrentOption(unitOptions, form.unit);

  return (
    <div className="space-y-4">
      <Field label="Line Item Title">
        <Input
          required
          disabled={disabled}
          value={form.title}
          onChange={(event) => onChange({ title: event.target.value })}
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
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {isUploading ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {isUploading ? "Uploading..." : "Upload"}
              <input
                accept={imageCropAccept}
                className="sr-only"
                disabled={disabled}
                type="file"
                onChange={onSelectImage}
              />
            </label>
            {previewImage ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  onChange({
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
          className="min-h-40"
          disabled={disabled}
          placeholder={markdownTextareaPlaceholder}
          value={form.detailedDescription}
          onChange={(event) =>
            onChange({ detailedDescription: event.target.value })
          }
        />
        <MarkdownFormatHint />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Unit">
          <select
            required
            className={selectClassName}
            disabled={disabled}
            value={form.unit}
            onChange={(event) => onChange({ unit: event.target.value })}
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
            disabled={disabled}
            inputMode="decimal"
            value={form.unitPriceMajor}
            normalizeValue={(value) => normalizeMoneyInput(value, currency)}
            onValueChange={(value) => onChange({ unitPriceMajor: value })}
          />
        </Field>
      </div>
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

function lineItemDataToForm(item: LineItemData, currency: string): FormState {
  return {
    title: item.title,
    detailedDescription: item.detailedDescription,
    unit: item.unit,
    unitPriceMajor: minorToMajorString(item.unitPriceMinor, currency),
    descriptionImageStoragePath: item.descriptionImageStoragePath ?? "",
    descriptionImageMimeType: item.descriptionImageMimeType,
    descriptionImageUrl: getLineItemImageSrc(item) ?? "",
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

function toLineItemDataDraft(
  item: LineItemData,
  patch: Partial<LineItemDataDraft> = {},
): LineItemDataDraft {
  return {
    title: item.title,
    detailedDescription: item.detailedDescription,
    unit: item.unit,
    unitPriceMinor: item.unitPriceMinor,
    descriptionImageStoragePath: item.descriptionImageStoragePath,
    descriptionImageMimeType: item.descriptionImageMimeType,
    ...patch,
  };
}

function hasRecordKey<T>(record: Record<string, T>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function removeRecordKey<T>(record: Record<string, T>, key: string) {
  if (!hasRecordKey(record, key)) {
    return record;
  }

  const next = { ...record };
  delete next[key];

  return next;
}

function removeRecordKeys<T>(record: Record<string, T>, keys: Iterable<string>) {
  let next: Record<string, T> | null = null;

  for (const key of keys) {
    if (!hasRecordKey(next ?? record, key)) {
      continue;
    }

    next ??= { ...record };
    delete next[key];
  }

  return next ?? record;
}

function removeSetValue<T>(set: Set<T>, value: T) {
  if (!set.has(value)) {
    return set;
  }

  const next = new Set(set);
  next.delete(value);

  return next;
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
  const missingHeaders = Object.entries(requiredCsvHeaders)
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
    const unitText = getCsvCell(record, indexes.unit).trim();
    const unit = unitText || defaultLineItemUnit;
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

    if (unit.length > 40) {
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

  return {
    drafts: errors.length > 0 ? [] : dedupeLineItemDataDraftsByTitle(drafts),
    errors,
  };
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
