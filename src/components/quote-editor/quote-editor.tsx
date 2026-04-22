"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { ExternalLink, Save, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LineItemsTable } from "@/components/quote-editor/line-items-table";
import { QuoteTotalsView } from "@/components/quote-editor/quote-totals";
import { calculateQuoteTotals } from "@/lib/quotes/calculate-totals";
import type { Quote, QuoteDraft } from "@/lib/quotes/types";

const emptyLineItem: QuoteDraft["lineItems"][number] = {
  name: "Discovery and Planning",
  description: "Project discovery workshop and implementation plan.",
  quantity: 1,
  unitPriceMinor: 150000,
  discountMinor: 0,
  taxRate: 0.12,
};

export function QuoteEditor({ quote }: { quote?: Quote }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>({
    title: quote?.title ?? "Website Redesign Quotation",
    client: quote?.client ?? {
      companyName: "Acme Corp",
      contactName: "Jane Client",
      email: "jane@example.com",
      phone: "",
    },
    currency: quote?.currency ?? "USD",
    validUntil: quote?.validUntil ?? "2026-05-31",
    terms: quote?.terms ?? "50% down payment, 50% on completion.",
    notes: quote?.notes ?? "Timeline starts after written acceptance.",
    lineItems:
      quote?.lineItems.map((lineItem) => ({
        name: lineItem.name,
        description: lineItem.description,
        quantity: lineItem.quantity,
        unitPriceMinor: lineItem.unitPriceMinor,
        discountMinor: lineItem.discountMinor,
        taxRate: lineItem.taxRate,
      })) ?? [emptyLineItem],
  });

  const totals = useMemo(
    () => calculateQuoteTotals(draft.lineItems, draft.quoteLevelDiscountMinor),
    [draft.lineItems, draft.quoteLevelDiscountMinor],
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
      return;
    }

    setMessage("Draft saved.");
    router.refresh();

    if (!quote && payload.quoteId) {
      router.push(`/quotes/${payload.quoteId}/edit`);
    }
  }

  async function sendQuote() {
    if (!quote) {
      await saveDraft();
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
        ? `Quote sent. Demo client link: /sign/${firstToken}`
        : "Quote sent.",
    );
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(saveDraft);
        }}
      >
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="size-4 text-stone-500" />
            <h2 className="font-semibold text-stone-950">Quote details</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
              />
            </Field>
            <Field label="Currency">
              <Input
                maxLength={3}
                value={draft.currency}
                onChange={(event) =>
                  updateDraft({ currency: event.target.value.toUpperCase() })
                }
              />
            </Field>
            <Field label="Valid until">
              <Input
                type="date"
                value={draft.validUntil}
                onChange={(event) =>
                  updateDraft({ validUntil: event.target.value })
                }
              />
            </Field>
            <Field label="Client company">
              <Input
                value={draft.client.companyName}
                onChange={(event) =>
                  updateDraft({
                    client: { ...draft.client, companyName: event.target.value },
                  })
                }
              />
            </Field>
            <Field label="Client contact">
              <Input
                value={draft.client.contactName}
                onChange={(event) =>
                  updateDraft({
                    client: { ...draft.client, contactName: event.target.value },
                  })
                }
              />
            </Field>
            <Field label="Client email">
              <Input
                type="email"
                value={draft.client.email}
                onChange={(event) =>
                  updateDraft({
                    client: { ...draft.client, email: event.target.value },
                  })
                }
              />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-5 font-semibold text-stone-950">Line items</h2>
          <LineItemsTable
            currency={draft.currency}
            lineItems={draft.lineItems}
            onChange={(lineItems) => updateDraft({ lineItems })}
          />
        </section>

        <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 md:grid-cols-2">
          <Field label="Terms">
            <Textarea
              value={draft.terms}
              onChange={(event) => updateDraft({ terms: event.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
          </Field>
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
        <QuoteTotalsView totals={totals} currency={draft.currency} />
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="font-semibold text-stone-950">Signature setup</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            The MVP creates one required client signature block anchored to the
            structured client signature section. Sent quotes freeze this field
            inside the immutable version snapshot.
          </p>
          {quote?.recipients.some((recipient) => recipient.accessToken) ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-stone-800">
                Client signing links
              </p>
              {quote.recipients.map((recipient) =>
                recipient.accessToken ? (
                  <a
                    className="flex items-center justify-between gap-3 rounded-md border border-stone-200 px-3 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-50"
                    href={`/sign/${recipient.accessToken}`}
                    key={recipient.id}
                  >
                    <span className="truncate">{recipient.email}</span>
                    <ExternalLink className="size-4 shrink-0" />
                  </a>
                ) : null,
              )}
            </div>
          ) : null}
        </div>
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
    <label className="space-y-2">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
