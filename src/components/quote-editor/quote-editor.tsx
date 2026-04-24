"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ExternalLink,
  FileSignature,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { LineItemsTable } from "@/components/quote-editor/line-items-table";
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
import type { Quote, QuoteDraft } from "@/lib/quotes/types";
import { formatQuoteIssuedDate } from "@/lib/utils";

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
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
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
  const taxMode = effectiveTemplate.lineItems.vat.mode;

  const totals = useMemo(
    () =>
      calculateQuoteTotals(
        draft.lineItems,
        draft.quoteLevelDiscountMinor,
        taxMode,
      ),
    [draft.lineItems, draft.quoteLevelDiscountMinor, taxMode],
  );

  function updateDraft(patch: Partial<QuoteDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
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
      setMessage(payload.error?.message ?? "Could not save quote draft.");
      return null;
    }

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

    const firstToken = payload.recipients?.[0]?.accessToken;
    setMessage(
      firstToken
        ? `Quote sent. Manual signing link: /sign/${firstToken}`
        : "Quote sent.",
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            void saveDraft();
          });
        }}
      >
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
              <StaticField label="Quotation Validity">
                <Input
                  type="date"
                  value={draft.validUntil ?? ""}
                  onChange={(event) =>
                    updateDraft({ validUntil: event.target.value })
                  }
                />
              </StaticField>
              <StaticField label={effectiveTemplate.company.dateLabel || "Date"}>
                <ReadOnlyBox value={formatQuoteIssuedDate(quote?.sentAt)} />
              </StaticField>
              <StaticField label="Quotation Number">
                <ReadOnlyBox
                  value={quote?.quoteNumber || effectiveTemplate.company.quoteNumberFormat}
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
              <StaticToggleField
                enabled={effectiveTemplate.offerTitle.enabled}
                label="Title Offer"
              >
                <ReadOnlyInput value={draft.title} />
              </StaticToggleField>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-5 font-semibold text-stone-950">
            Customer information
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={clientNameLabel}>
              <Input
                required
                placeholder={clientNameLabel}
                value={draft.client.contactName}
                onChange={(event) =>
                  updateDraft({
                    client: { ...draft.client, contactName: event.target.value },
                  })
                }
              />
            </Field>
            {(effectiveTemplate.customer.clientCompany.enabled ?? true) ? (
              <Field label={effectiveTemplate.customer.clientCompany.value || "Client Company"}>
                <Input
                  placeholder={clientCompanyPlaceholder}
                  value={draft.client.companyName ?? ""}
                  onChange={(event) =>
                    updateDraft({
                      client: { ...draft.client, companyName: event.target.value },
                    })
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
                    updateDraft({
                      client: { ...draft.client, address: event.target.value },
                    })
                  }
                />
              </Field>
            ) : null}
            {(effectiveTemplate.customer.email.enabled ?? true) ? (
              <Field label={effectiveTemplate.customer.email.value || "Email"}>
                <Input
                  type="email"
                  placeholder={clientEmailPlaceholder}
                  value={draft.client.email ?? ""}
                  onChange={(event) =>
                    updateDraft({
                      client: { ...draft.client, email: event.target.value },
                    })
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
                    updateDraft({
                      client: { ...draft.client, phone: event.target.value },
                    })
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
            template={effectiveTemplate}
            onChange={(lineItems) => updateDraft({ lineItems })}
          />
        </section>

        <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 md:grid-cols-2">
          <StaticField label="Payment Terms">
            <ReadOnlyText value={effectiveTemplate.paymentTerms} />
          </StaticField>
          <StaticField label="Terms & Conditions">
            <ReadOnlyText value={effectiveTemplate.termsAndConditions} />
          </StaticField>
          <StaticField label="Client signature">
            <ReadOnlyBox
              value={
                effectiveTemplate.signature.nameCase === "uppercase"
                  ? "Case type: UPPERCASE"
                  : "Case type: Title Case"
              }
            />
          </StaticField>
          <Field label="Quoter signature">
            <div className="space-y-3">
              <Input
                placeholder="Printed name"
                value={draft.quoterPrintedName ?? ""}
                onChange={(event) =>
                  updateDraft({ quoterPrintedName: event.target.value })
                }
              />
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
                  disabled={!quote}
                  onClick={() => setSignatureOpen(true)}
                >
                  <FileSignature className="size-4" />
                  Capture signature
                </Button>
                {draft.quoterSignatureAsset ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!quote}
                    onClick={() => startTransition(removeQuoterSignature)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </Field>
          {effectiveTemplate.footer.enabled ? (
            <div className="md:col-span-2">
              <StaticField label="Footer">
                <ReadOnlyText value={effectiveTemplate.footer.value} />
              </StaticField>
            </div>
          ) : null}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isPending}>
            <Save className="size-4" />
            Save draft
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => startTransition(sendQuote)}
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
          taxMode={taxMode}
        />
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="font-semibold text-stone-950">Client signing links</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Sending a quote always creates a signing link, even when the client
            email is blank.
          </p>
          {quote?.recipients.some((recipient) => recipient.accessToken) ? (
            <div className="mt-4 space-y-2">
              {quote.recipients.map((recipient) =>
                recipient.accessToken ? (
                  <a
                    className="flex items-center justify-between gap-3 rounded-md border border-stone-200 px-3 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-50"
                    href={`/sign/${recipient.accessToken}`}
                    key={recipient.id}
                  >
                    <span className="truncate">
                      {recipient.email || "Manual signing link"}
                    </span>
                    <ExternalLink className="size-4 shrink-0" />
                  </a>
                ) : null,
              )}
            </div>
          ) : null}
        </div>
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

function createInitialDraft(quote: Quote | undefined, template: QuoteTemplate): QuoteDraft {
  if (!quote) {
    return createDraftFromTemplate(template);
  }

  return {
    title: quote.title,
    client: {
      ...quote.client,
      companyName: quote.client.companyName ?? "",
      address: quote.client.address ?? "",
      email: quote.client.email ?? "",
      phone: quote.client.phone ?? "",
    },
    currency: normalizeCurrency(quote.currency),
    validUntil: quote.validUntil ?? "",
    requestSummary: quote.requestSummary ?? "",
    terms: quote.terms ?? "",
    notes: quote.notes ?? "",
    templateSnapshot: quote.templateSnapshot ?? template,
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function StaticField({
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
