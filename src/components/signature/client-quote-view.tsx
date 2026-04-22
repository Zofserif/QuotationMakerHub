"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileSignature, Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignatureModal } from "@/components/signature/signature-modal";
import type { ClientQuoteView } from "@/lib/quotes/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function ClientQuoteViewComponent({
  token,
  initialView,
}: {
  token: string;
  initialView: ClientQuoteView;
}) {
  const [view, setView] = useState(initialView);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(() =>
    getInitialSignatureFieldId(initialView),
  );
  const [typedName, setTypedName] = useState(initialView.recipient.name);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allSigned = view.requiredSignatureFields.every(
    (field) => field.status === "signed",
  );
  const locked = Boolean(view.recipient.lockedAt);

  function openSignatureField(signatureFieldId: string) {
    if (locked) {
      return;
    }

    setMessage(null);
    setSelectedFieldId(signatureFieldId);
    const url = new URL(window.location.href);
    url.searchParams.set("signature", signatureFieldId);
    url.hash = "signature-pad";
    window.history.replaceState(null, "", url);
  }

  function closeSignatureField() {
    setSelectedFieldId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("signature");
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  async function refreshView() {
    const response = await fetch(`/api/client-link/${token}/quote`);
    const payload = await response.json();

    if (response.ok) {
      setView(payload);
    }
  }

  async function acceptQuote() {
    setMessage(null);
    const response = await fetch(`/api/client-link/${token}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        typedName,
        confirmationChecked: confirmed,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not accept quote.");
      return;
    }

    setMessage(`Accepted at ${formatDate(payload.acceptedAt)}.`);
    await refreshView();
  }

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">
              {view.quote.quoteNumber} · version {view.versionNumber}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-stone-950">
              {view.quote.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white">
            {locked ? <Lock className="size-4" /> : <FileSignature className="size-4" />}
            {locked ? "Accepted and locked" : "Awaiting signature"}
          </div>
        </div>

        <div className="bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-8">
          <section className="grid gap-6 border-b border-stone-200 pb-6 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Prepared for
              </h2>
              <p className="mt-2 font-semibold text-stone-950">
                {view.quote.client.companyName || view.quote.client.contactName}
              </p>
              <p className="text-sm text-stone-600">
                {view.quote.client.contactName}
              </p>
              <p className="text-sm text-stone-600">{view.quote.client.email}</p>
            </div>
            <div className="space-y-2 rounded-lg bg-stone-50 p-4">
              <TotalRow
                label="Subtotal"
                value={formatMoney(view.quote.subtotalMinor, view.quote.currency)}
              />
              <TotalRow
                label="Tax"
                value={formatMoney(view.quote.taxMinor, view.quote.currency)}
              />
              <TotalRow
                label="Total"
                value={formatMoney(view.quote.totalMinor, view.quote.currency)}
                strong
              />
            </div>
          </section>

          <section className="py-6">
            <div className="overflow-hidden rounded-lg border border-stone-200">
              {view.quote.lineItems.map((lineItem) => (
                <div
                  className="grid gap-3 border-b border-stone-200 px-4 py-4 text-sm last:border-b-0 sm:grid-cols-[1fr_120px] sm:items-start"
                  key={lineItem.id}
                >
                  <div>
                    <p className="font-medium text-stone-950">{lineItem.name}</p>
                    <p className="mt-1 text-stone-500">
                      {lineItem.description}
                    </p>
                  </div>
                  <p className="font-semibold text-stone-950 sm:text-right">
                    {formatMoney(lineItem.lineTotalMinor, view.quote.currency)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 border-t border-stone-200 py-6 md:grid-cols-2">
            <div>
              <h2 className="font-semibold text-stone-950">Terms</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                {view.quote.terms}
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-stone-950">Notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                {view.quote.notes}
              </p>
            </div>
          </section>

          <section className="border-t border-stone-200 pt-6">
            <h2 className="font-semibold text-stone-950">Required signatures</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {view.requiredSignatureFields.map((field) => (
                <a
                  aria-disabled={locked}
                  aria-label={`${field.label}. ${
                    field.status === "signed"
                      ? "Signature placed"
                      : "Open signature pad"
                  }`}
                  className="block min-h-32 touch-manipulation rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-left transition hover:border-stone-500 active:border-stone-950 active:bg-white aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
                  href={`?signature=${field.id}#signature-pad`}
                  id="signature-pad"
                  key={field.id}
                  onClick={() => openSignatureField(field.id)}
                  onPointerUp={(event) => {
                    if (event.pointerType !== "mouse") {
                      openSignatureField(field.id);
                    }
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-medium text-stone-950">
                      {field.label}
                    </span>
                    {field.status === "signed" ? (
                      <CheckCircle2 className="size-5 text-emerald-600" />
                    ) : (
                      <FileSignature className="size-5 text-stone-500" />
                    )}
                  </div>
                  {field.signatureAsset?.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Placed signature"
                      className="h-20 w-full object-contain"
                      src={field.signatureAsset.dataUrl}
                    />
                  ) : (
                    <span className="text-sm text-stone-500">
                      Click to place signature
                    </span>
                  )}
                  {!locked && field.status !== "signed" ? (
                    <span className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900">
                      <FileSignature className="size-4" />
                      Use signature pad
                    </span>
                  ) : null}
                </a>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="space-y-2">
                <span className="text-sm font-medium text-stone-800">
                  Typed name
                </span>
                <Input
                  disabled={locked}
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                />
              </label>
              <Button
                type="button"
                disabled={!allSigned || !confirmed || locked || isPending}
                onClick={() => startTransition(acceptQuote)}
              >
                <Lock className="size-4" />
                Confirm acceptance
              </Button>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-stone-700">
              <input
                checked={confirmed}
                className="mt-1 size-4"
                disabled={locked}
                type="checkbox"
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                I have reviewed the quotation and agree to the terms for this
                version.
              </span>
            </label>
            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => startTransition(refreshView)}
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              {message ? <p className="text-sm text-stone-600">{message}</p> : null}
            </div>
          </section>
        </div>
      </div>

      {selectedFieldId ? (
        <SignatureModal
          open
          token={token}
          signatureFieldId={selectedFieldId}
          onClose={closeSignatureField}
          onUploaded={() => startTransition(refreshView)}
        />
      ) : null}
    </main>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold" : "text-sm text-stone-600"}>
        {label}
      </span>
      <span className={strong ? "text-xl font-bold" : "text-sm"}>{value}</span>
    </div>
  );
}

function getInitialSignatureFieldId(view: ClientQuoteView) {
  if (typeof window === "undefined" || view.recipient.lockedAt) {
    return null;
  }

  const signatureFieldId = new URLSearchParams(window.location.search).get(
    "signature",
  );

  if (
    signatureFieldId &&
    view.requiredSignatureFields.some((field) => field.id === signatureFieldId)
  ) {
    return signatureFieldId;
  }

  return null;
}
