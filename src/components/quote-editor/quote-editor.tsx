"use client";

import { useState, type ReactNode } from "react";
import {
  FileSignature,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { LineItemsTable } from "@/components/quote-editor/line-items-table";
import { QuoteSharePanel } from "@/components/quote-share/quote-share-panel";
import { QuoteTotalsView } from "@/components/quote-editor/quote-totals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignatureModal } from "@/components/signature/signature-modal";
import { normalizeCurrency } from "@/lib/currency";
import {
  createDraftFromTemplate,
  mergeQuoteTemplate,
} from "@/lib/quote-templates/defaults";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { LineItemData } from "@/lib/line-item-data/types";
import { calculateQuoteTotals } from "@/lib/quotes/calculate-totals";
import {
  buildQuoteShareLinks,
  buildUnavailableQuoteShareLinks,
} from "@/lib/quotes/share-links";
import type {
  Quote,
  QuoteDraft,
  QuoteShareLink,
  QuoteStatus,
  UnavailableQuoteShareLink,
} from "@/lib/quotes/types";
import type {
  ValidationErrorDetails,
  ValidationIssue,
} from "@/lib/quotes/validation";
import { formatQuoteIssuedDate } from "@/lib/utils";

const customerFieldVisibilityOptions = [
  { key: "clientCompany", label: "Client Company" },
  { key: "address", label: "Address" },
  { key: "email", label: "Email" },
  { key: "contactNumber", label: "Contact #" },
] as const;

type CustomerFieldVisibilityKey =
  (typeof customerFieldVisibilityOptions)[number]["key"];

type QuoteDraftErrorPayload = {
  error?: {
    message?: string;
    details?: ValidationErrorDetails;
  };
};

type PendingQuoteAction = "save" | "send" | "remove-signature";

export function QuoteEditor({
  quote,
  template,
  lineItemData = [],
}: {
  quote?: Quote;
  template?: QuoteTemplate;
  lineItemData?: LineItemData[];
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] =
    useState<PendingQuoteAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    [],
  );
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [shareLinks, setShareLinks] = useState<QuoteShareLink[]>(() =>
    quote ? buildQuoteShareLinks(quote) : [],
  );
  const [unavailableShareLinks, setUnavailableShareLinks] = useState<
    UnavailableQuoteShareLink[]
  >(() => (quote ? buildUnavailableQuoteShareLinks(quote) : []));
  const [shareStatus, setShareStatus] = useState<QuoteStatus>(
    quote?.status ?? "draft",
  );
  const [draft, setDraft] = useState<QuoteDraft>(() =>
    createInitialDraft(quote, mergeQuoteTemplate(quote?.templateSnapshot ?? template)),
  );
  const effectiveTemplate = mergeQuoteTemplate(
    draft.templateSnapshot ?? quote?.templateSnapshot ?? template,
  );
  const clientNameLabel =
    effectiveTemplate.customer.clientNameLabel.trim() || "Client Name";
  const clientCompanyPlaceholder = resolvePlaceholder(
    effectiveTemplate.customer.clientCompany.value,
    "Client Company",
  );
  const clientAddressPlaceholder = resolvePlaceholder(
    effectiveTemplate.customer.address.value,
    "Address",
  );
  const clientEmailPlaceholder = resolvePlaceholder(
    effectiveTemplate.customer.email.value,
    "Email",
  );
  const clientPhonePlaceholder = resolvePlaceholder(
    effectiveTemplate.customer.contactNumber.value,
    "Contact #",
  );
  const offerTitlePlaceholder = resolvePlaceholder(
    effectiveTemplate.offerTitle.value,
    "Quotation",
  );
  const vatEnabled = effectiveTemplate.lineItems.vat.enabled;
  const taxMode = vatEnabled ? effectiveTemplate.lineItems.vat.mode : "exclusive";
  const lineItemsForTotals = vatEnabled
    ? draft.lineItems
    : draft.lineItems.map((lineItem) => ({ ...lineItem, taxRate: 0 }));
  const isPending = pendingAction !== null;
  const fieldError = (path: Array<string | number>) =>
    getDraftIssueMessage(validationIssues, path, { clientNameLabel });

  const totals = calculateQuoteTotals(
    lineItemsForTotals,
    draft.quoteLevelDiscountMinor,
    taxMode,
  );

  function updateDraft(patch: Partial<QuoteDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateClient(patch: Partial<QuoteDraft["client"]>) {
    setDraft((current) => ({
      ...current,
      client: { ...current.client, ...patch },
    }));
  }

  function updateCustomerFieldVisibility(
    field: CustomerFieldVisibilityKey,
    enabled: boolean,
  ) {
    setDraft((current) => {
      const templateSnapshot = mergeQuoteTemplate(
        current.templateSnapshot ?? quote?.templateSnapshot ?? template,
      );

      return {
        ...current,
        templateSnapshot: {
          ...templateSnapshot,
          customer: {
            ...templateSnapshot.customer,
            [field]: {
              ...templateSnapshot.customer[field],
              enabled,
            },
          },
        },
      };
    });
  }

  async function saveDraft() {
    setMessage(null);
    const response = await fetch(quote ? `/api/quotes/${quote.id}` : "/api/quotes", {
      method: quote ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft),
    });
    const payload = await response.json();

    if (!response.ok) {
      const errorPayload = payload as QuoteDraftErrorPayload;
      setValidationIssues(errorPayload.error?.details?.issues ?? []);
      setMessage(
        formatQuoteDraftSaveError(errorPayload, {
          clientNameLabel,
        }),
      );
      return null;
    }

    setValidationIssues([]);
    setMessage("Draft saved.");
    router.refresh();

    if (!quote && payload.quoteId) {
      router.push(`/quotes/${payload.quoteId}/edit`);
    }

    return payload as { quoteId?: string };
  }

  async function sendQuote() {
    if (!quote) {
      await saveDraft();
      return;
    }

    const saved = await saveDraft();

    if (!saved) {
      return;
    }

    setMessage(null);
    const response = await fetch(`/api/quotes/${quote.id}/send`, {
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not send quote.");
      return;
    }

    setShareStatus(payload.status ?? "sent");
    setShareLinks(parseShareLinksPayload(payload));
    setUnavailableShareLinks(payload.unavailableShareLinks ?? []);
    setMessage(
      payload.unavailableShareLinks?.length
        ? "Quote sent. Existing customer link remains valid but cannot be displayed."
        : "Quote sent. Copy or scan the signing link in the share panel.",
    );
    router.refresh();
  }

  async function uploadQuoterSignature(input: {
    imageBase64: string;
    sourceMethod: "camera" | "upload" | "draw";
  }) {
    if (!quote) {
      throw new Error("Save the draft before adding the quoter signature.");
    }

    const response = await fetch(`/api/quotes/${quote.id}/quoter-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Could not save signature.");
    }

    updateDraft({
      quoterSignatureAsset: payload.quoterSignatureAsset,
    });
    setMessage("Quoter signature updated.");
    router.refresh();
  }

  async function removeQuoterSignature() {
    if (!quote) {
      return;
    }

    const response = await fetch(`/api/quotes/${quote.id}/quoter-signature`, {
      method: "DELETE",
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not remove signature.");
      return;
    }

    updateDraft({
      quoterSignatureAsset: null,
    });
    setMessage("Quoter signature removed.");
    router.refresh();
  }

  async function runPendingAction(
    action: PendingQuoteAction,
    task: () => Promise<unknown>,
    fallbackMessage: string,
  ) {
    setPendingAction(action);

    try {
      await task();
    } catch {
      setMessage(fallbackMessage);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void runPendingAction("save", saveDraft, "Could not save draft.");
        }}
      >
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-5 font-semibold text-stone-950">Quote details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Quotation name"
              error={fieldError(["quotationName"])}
            >
              <Input
                placeholder="Defaults to quotation number"
                value={draft.quotationName}
                onChange={(event) =>
                  updateDraft({ quotationName: event.target.value })
                }
              />
            </Field>
            {effectiveTemplate.offerTitle.enabled ? (
              <Field label="Title Offer" error={fieldError(["title"])}>
                <Input
                  maxLength={160}
                  placeholder={offerTitlePlaceholder}
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                />
              </Field>
            ) : null}
            <Field
              label="Quotation Validity"
              required
              error={fieldError(["validUntil"])}
            >
              <Input
                required
                type="date"
                value={draft.validUntil ?? ""}
                onChange={(event) =>
                  updateDraft({ validUntil: event.target.value })
                }
              />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="size-4 text-stone-500" />
            <h2 className="font-semibold text-stone-950">Quotation Designer</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-4">
              <StaticToggleField
                enabled={effectiveTemplate.logo.enabled}
                label="Logo"
              >
                {effectiveTemplate.logo.enabled && effectiveTemplate.logo.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Company logo"
                    className="h-24 w-full rounded-md border border-stone-200 object-contain"
                    src={effectiveTemplate.logo.dataUrl}
                  />
                ) : (
                  <ReadOnlyBox value="Hidden" />
                )}
              </StaticToggleField>
              <StaticField label={effectiveTemplate.company.dateLabel || "Date"}>
                <ReadOnlyBox value={formatQuoteIssuedDate(quote?.sentAt)} />
              </StaticField>
              <StaticField label="Quotation Number">
                <ReadOnlyBox
                  value={quote?.quoteNumber || "Generated when saved"}
                />
              </StaticField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StaticToggleField
                enabled={effectiveTemplate.company.name.enabled}
                label="Company Name"
              >
                <ReadOnlyInput
                  value={effectiveTemplate.company.name.value}
                />
              </StaticToggleField>
              <StaticField label="Address">
                <ReadOnlyInput value={effectiveTemplate.company.address} />
              </StaticField>
              <StaticToggleField
                enabled={effectiveTemplate.company.telephone.enabled}
                label="Telephone"
              >
                <ReadOnlyInput value={effectiveTemplate.company.telephone.value} />
              </StaticToggleField>
              <StaticToggleField
                enabled={effectiveTemplate.company.phone.enabled}
                label="Phone number"
              >
                <ReadOnlyInput value={effectiveTemplate.company.phone.value} />
              </StaticToggleField>
              <StaticToggleField
                enabled={effectiveTemplate.company.email.enabled}
                label="Email"
              >
                <ReadOnlyInput value={effectiveTemplate.company.email.value} />
              </StaticToggleField>
              <StaticToggleField
                enabled={effectiveTemplate.company.vatRegTin.enabled}
                label="VAT Reg TIN"
              >
                <ReadOnlyInput value={effectiveTemplate.company.vatRegTin.value} />
              </StaticToggleField>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-5 font-semibold text-stone-950">
            Customer information
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Visible fields</Label>
              <div className="flex flex-wrap gap-2">
                {customerFieldVisibilityOptions.map(({ key, label }) => (
                  <CustomerFieldToggle
                    checked={effectiveTemplate.customer[key].enabled ?? true}
                    key={key}
                    label={resolvePlaceholder(
                      effectiveTemplate.customer[key].value,
                      label,
                    )}
                    onChange={(checked) =>
                      updateCustomerFieldVisibility(key, checked)
                    }
                  />
                ))}
              </div>
            </div>
            <Field
              label={clientNameLabel}
              required
              error={fieldError(["client", "contactName"])}
            >
              <Input
                required
                placeholder={clientNameLabel}
                value={draft.client.contactName}
                onChange={(event) =>
                  updateClient({ contactName: event.target.value })
                }
              />
            </Field>
            {(effectiveTemplate.customer.clientCompany.enabled ?? true) ? (
              <Field label={effectiveTemplate.customer.clientCompany.value || "Client Company"}>
                <Input
                  placeholder={clientCompanyPlaceholder}
                  value={draft.client.companyName ?? ""}
                  onChange={(event) =>
                    updateClient({ companyName: event.target.value })
                  }
                />
              </Field>
            ) : null}
            {(effectiveTemplate.customer.address.enabled ?? true) ? (
              <Field label={effectiveTemplate.customer.address.value || "Address"}>
                <Input
                  placeholder={clientAddressPlaceholder}
                  value={draft.client.address ?? ""}
                  onChange={(event) =>
                    updateClient({ address: event.target.value })
                  }
                />
              </Field>
            ) : null}
            {(effectiveTemplate.customer.email.enabled ?? true) ? (
              <Field
                label={effectiveTemplate.customer.email.value || "Email"}
                error={fieldError(["client", "email"])}
              >
                <Input
                  type="email"
                  placeholder={clientEmailPlaceholder}
                  value={draft.client.email ?? ""}
                  onChange={(event) =>
                    updateClient({ email: event.target.value })
                  }
                />
              </Field>
            ) : null}
            {(effectiveTemplate.customer.contactNumber.enabled ?? true) ? (
              <Field label={effectiveTemplate.customer.contactNumber.value || "Contact #"}>
                <Input
                  placeholder={clientPhonePlaceholder}
                  value={draft.client.phone ?? ""}
                  onChange={(event) =>
                    updateClient({ phone: event.target.value })
                  }
                />
              </Field>
            ) : null}
          </div>
        </section>

        {effectiveTemplate.requestSummary.enabled ? (
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="mb-5 font-semibold text-stone-950">Request Summary</h2>
            <Textarea
              className="min-h-32"
              placeholder="Markdown summary"
              value={draft.requestSummary ?? ""}
              onChange={(event) =>
                updateDraft({ requestSummary: event.target.value })
              }
            />
          </section>
        ) : null}

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-5 font-semibold text-stone-950">Line items</h2>
          <LineItemsTable
            currency={draft.currency}
            lineItems={draft.lineItems}
            lineItemData={lineItemData}
            validationIssues={validationIssues}
            template={effectiveTemplate}
            onChange={(lineItems) => updateDraft({ lineItems })}
          />
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-5 font-semibold text-stone-950">
            Payment and terms
          </h2>
          <div className="grid gap-4">
            <Field label="Payment Terms" error={fieldError(["terms"])}>
              <Textarea
                className="min-h-36"
                value={draft.terms ?? ""}
                onChange={(event) =>
                  updateDraft({ terms: event.target.value })
                }
              />
            </Field>
            <Field
              label="Terms & Conditions"
              error={fieldError(["notes"])}
            >
              <Textarea
                className="min-h-36"
                value={draft.notes ?? ""}
                onChange={(event) =>
                  updateDraft({ notes: event.target.value })
                }
              />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 md:grid-cols-2">
          <StaticField label="Client signature">
            <ReadOnlyBox
              value={
                effectiveTemplate.signature.nameCase === "uppercase"
                  ? "Case type: UPPERCASE"
                  : "Case type: Title Case"
              }
            />
          </StaticField>
          <StaticField label="Quoter signature" marker="Required to send">
            <div className="space-y-3">
              <Field label="Printed name" marker="Required to send">
                <Input
                  placeholder="Printed name"
                  value={draft.quoterPrintedName ?? ""}
                  onChange={(event) =>
                    updateDraft({ quoterPrintedName: event.target.value })
                  }
                />
              </Field>
              {draft.quoterSignatureAsset?.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Quoter signature"
                  className="h-24 w-full rounded-md border border-stone-200 object-contain"
                  src={draft.quoterSignatureAsset.dataUrl}
                />
              ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                  {quote
                    ? "No quoter signature yet"
                    : "Save the draft first to capture the quoter signature"}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!quote || isPending}
                  onClick={() => setSignatureOpen(true)}
                >
                  <FileSignature className="size-4" />
                  Capture signature
                </Button>
                {draft.quoterSignatureAsset ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!quote || isPending}
                    loading={pendingAction === "remove-signature"}
                    loadingText="Removing..."
                    onClick={() =>
                      void runPendingAction(
                        "remove-signature",
                        removeQuoterSignature,
                        "Could not remove signature.",
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </StaticField>
          {effectiveTemplate.footer.enabled ? (
            <div className="md:col-span-2">
              <StaticField label="Footer">
                <ReadOnlyText value={effectiveTemplate.footer.value} />
              </StaticField>
            </div>
          ) : null}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            loading={pendingAction === "save"}
            loadingText="Saving..."
          >
            <Save className="size-4" />
            Save draft
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            loading={pendingAction === "send"}
            loadingText="Sending..."
            onClick={() =>
              void runPendingAction("send", sendQuote, "Could not send quote.")
            }
          >
            <Send className="size-4" />
            Send quote
          </Button>
          {message ? (
            <p className="text-sm font-medium text-stone-600">{message}</p>
          ) : null}
        </div>
      </form>

      <aside className="space-y-4">
        <QuoteTotalsView
          totals={totals}
          currency={draft.currency}
          taxEnabled={vatEnabled}
          taxMode={taxMode}
          moneyDisplay={effectiveTemplate.lineItems.unitPrice.display}
        />
        <QuoteSharePanel
          quoteId={quote?.id}
          quoteStatus={quote ? shareStatus : "draft"}
          initialShareLinks={shareLinks}
          initialUnavailableShareLinks={unavailableShareLinks}
        />
      </aside>

      {signatureOpen ? (
        <SignatureModal
          open
          onClose={() => setSignatureOpen(false)}
          onUploaded={() => setSignatureOpen(false)}
          onApproveSignature={uploadQuoterSignature}
        />
      ) : null}
    </div>
  );
}

function parseShareLinksPayload(payload: {
  shareLinks?: QuoteShareLink[];
  unavailableShareLinks?: UnavailableQuoteShareLink[];
  recipients?: Array<{
    recipientId: string;
    email: string;
    status: QuoteShareLink["status"];
    accessToken?: string;
    accessTokenExpiresAt?: string;
    signingPath?: string;
  }>;
}) {
  if (payload.shareLinks) {
    return payload.shareLinks;
  }

  return (payload.recipients ?? []).flatMap((recipient) => {
    if (!recipient.accessToken) {
      return [];
    }

    return {
      recipientId: recipient.recipientId,
      name: recipient.email || "Manual signing link",
      email: recipient.email,
      status: recipient.status,
      accessToken: recipient.accessToken,
      accessTokenExpiresAt: recipient.accessTokenExpiresAt,
      signingPath: recipient.signingPath ?? `/sign/${recipient.accessToken}`,
    };
  });
}

function createInitialDraft(quote: Quote | undefined, template: QuoteTemplate): QuoteDraft {
  if (!quote) {
    return createDraftFromTemplate(template);
  }

  const templateSnapshot = quote.templateSnapshot ?? template;

  return {
    quotationName: quote.quotationName || quote.title,
    title: quote.title,
    client: {
      ...quote.client,
      companyName: quote.client.companyName ?? "",
      address: quote.client.address ?? "",
      email: quote.client.email ?? "",
      phone: quote.client.phone ?? "",
    },
    currency: normalizeCurrency(quote.currency),
    validUntil: quote.validUntil ?? getDefaultValidityDate(quote.createdAt),
    requestSummary: quote.requestSummary ?? "",
    terms: quote.terms ?? templateSnapshot.paymentTerms,
    notes: quote.notes ?? templateSnapshot.termsAndConditions,
    templateSnapshot,
    quoterPrintedName: quote.quoterPrintedName ?? "",
    quoterSignatureAsset: quote.quoterSignatureAsset ?? null,
    lineItems: quote.lineItems.map((lineItem) => ({
      name: lineItem.name,
      description: lineItem.description ?? "",
      unit: lineItem.unit || "Unit",
      quantity: lineItem.quantity,
      unitPriceMinor: lineItem.unitPriceMinor,
      discountMinor: lineItem.discountMinor,
      taxRate: lineItem.taxRate,
      descriptionImageStoragePath: lineItem.descriptionImageStoragePath,
      descriptionImageMimeType: lineItem.descriptionImageMimeType,
      descriptionImageUrl: lineItem.descriptionImageUrl,
    })),
  };
}

function getDefaultValidityDate(value?: string | Date) {
  const baseDate = value ? new Date(value) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    return formatDateInput(addLocalDays(new Date(), 14));
  }

  return formatDateInput(addLocalDays(baseDate, 14));
}

function addLocalDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function formatQuoteDraftSaveError(
  payload: QuoteDraftErrorPayload,
  input: { clientNameLabel: string },
) {
  const issueMessages = Array.from(
    new Set(
      (payload.error?.details?.issues ?? [])
        .map((issue) => formatQuoteDraftIssue(issue, input))
        .filter((message): message is string => Boolean(message)),
    ),
  );

  if (issueMessages.length > 0) {
    return `Cannot save draft: ${issueMessages.join(" ")}`;
  }

  return payload.error?.message ?? "Could not save quote draft.";
}

function formatQuoteDraftIssue(
  issue: ValidationErrorDetails["issues"][number],
  input: { clientNameLabel: string },
) {
  const [scope, indexOrField, nestedField] = issue.path;

  if (scope === "lineItems") {
    if (issue.path.length === 1) {
      return "Add at least one line item.";
    }

    const rowLabel =
      typeof indexOrField === "number"
        ? `Line item ${indexOrField + 1}`
        : "Line item";

    if (nestedField === "name") {
      return `${rowLabel}: name is required.`;
    }

    if (nestedField === "unit") {
      return `${rowLabel}: unit is required.`;
    }

    if (nestedField === "quantity") {
      return `${rowLabel}: quantity must be greater than 0.`;
    }

    if (nestedField === "unitPriceMinor") {
      return `${rowLabel}: unit price cannot be negative.`;
    }

    if (nestedField === "discountMinor") {
      return `${rowLabel}: discount cannot be negative.`;
    }

    if (nestedField === "taxRate") {
      return `${rowLabel}: VAT rate must be between 0% and 100%.`;
    }

    return `${rowLabel}: ${normalizeValidationMessage(issue.message)}.`;
  }

  if (scope === "client" && indexOrField === "contactName") {
    return `${input.clientNameLabel} is required.`;
  }

  if (
    scope === "client" &&
    indexOrField === "email" &&
    issue.code === "invalid_format"
  ) {
    return "Email must be a valid email address.";
  }

  if (scope === "quotationName") {
    return issue.code === "too_big"
      ? "Quotation name must be 160 characters or fewer."
      : "Quotation name is invalid.";
  }

  if (scope === "title") {
    return issue.code === "too_big"
      ? "Quote title must be 160 characters or fewer."
      : "Quote title is invalid.";
  }

  if (
    scope === "validUntil" &&
    (issue.code === "too_small" || issue.code === "invalid_type")
  ) {
    return "Quotation validity is required.";
  }

  if (
    scope === "validUntil" &&
    issue.code === "invalid_format" &&
    issue.format === "date"
  ) {
    return "Quotation validity must be a valid date.";
  }

  if (typeof scope === "string") {
    return `${startCase(scope)}: ${normalizeValidationMessage(issue.message)}.`;
  }

  return null;
}

function getDraftIssueMessage(
  issues: ValidationIssue[],
  path: Array<string | number>,
  input: { clientNameLabel: string },
) {
  const issue = issues.find((candidate) => isPathMatch(candidate.path, path));

  return issue ? (formatQuoteDraftIssue(issue, input) ?? undefined) : undefined;
}

function isPathMatch(
  candidatePath: Array<string | number>,
  targetPath: Array<string | number>,
) {
  return (
    candidatePath.length >= targetPath.length &&
    targetPath.every((segment, index) => candidatePath[index] === segment)
  );
}

function normalizeValidationMessage(message: string) {
  if (message === "Too small: expected string to have >=1 characters") {
    return "is required";
  }

  return message.endsWith(".") ? message.slice(0, -1) : message;
}

function startCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function Field({
  label,
  children,
  error,
  marker,
  required = false,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  marker?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} marker={marker} required={required} />
      {children}
      {error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

function StaticField({
  label,
  children,
  marker,
}: {
  label: string;
  children: ReactNode;
  marker?: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} marker={marker} />
      {children}
    </div>
  );
}

function FieldLabel({
  label,
  marker,
  required = false,
}: {
  label: string;
  marker?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label>{label}</Label>
      {required || marker ? (
        <span className="rounded-sm bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600">
          {marker ?? "Required"}
        </span>
      ) : null}
    </div>
  );
}

function StaticToggleField({
  enabled,
  label,
  children,
}: {
  enabled: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <StaticField label={`${label}${enabled ? "" : " (Hidden)"}`}>
      {enabled ? children : <ReadOnlyBox value="Hidden" />}
    </StaticField>
  );
}

function CustomerFieldToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-10 items-center gap-3 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800">
      <input
        checked={checked}
        className="size-4"
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function ReadOnlyInput({ value }: { value: string }) {
  return <Input readOnly value={value} />;
}

function ReadOnlyBox({ value }: { value: string }) {
  return (
    <div className="flex min-h-10 items-center rounded-md border border-stone-200 bg-stone-50 px-3 text-sm text-stone-600">
      {value}
    </div>
  );
}

function ReadOnlyText({ value }: { value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-600">
      {value}
    </div>
  );
}

function resolvePlaceholder(value: string, fallback: string) {
  return value.trim() || fallback;
}
