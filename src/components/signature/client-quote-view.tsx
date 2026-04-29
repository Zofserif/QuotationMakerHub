"use client";

import { useState } from "react";
import { CheckCircle2, FileSignature, Lock, RefreshCw } from "lucide-react";

import { QuoteDocument } from "@/components/quote-editor/quote-document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignatureModal } from "@/components/signature/signature-modal";
import type { ClientQuoteView } from "@/lib/quotes/types";
import { formatDate } from "@/lib/utils";

export function ClientQuoteViewComponent({
  token,
  initialView,
  initialSignatureFieldId,
}: {
  token: string;
  initialView: ClientQuoteView;
  initialSignatureFieldId: string | null;
}) {
  const [view, setView] = useState(initialView);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    initialSignatureFieldId,
  );
  const [typedName, setTypedName] = useState(initialView.recipient.name);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "accept" | "refresh" | null
  >(null);
  const isPending = pendingAction !== null;
  const allSigned = view.requiredSignatureFields.every(
    (field) => field.status === "signed",
  );
  const locked = Boolean(view.recipient.lockedAt);
  const clientSignatures = view.requiredSignatureFields.map((field) => ({
    field,
    recipient: view.recipient,
    placement: field.placement,
    signatureAsset: field.signatureAsset,
  }));

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

  async function runPendingAction(
    action: "accept" | "refresh",
    task: () => Promise<void>,
    fallbackMessage?: string,
  ) {
    setPendingAction(action);

    try {
      await task();
    } catch {
      if (fallbackMessage) {
        setMessage(fallbackMessage);
      }
    } finally {
      setPendingAction(null);
    }
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
              Client review
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white">
            {locked ? <Lock className="size-4" /> : <FileSignature className="size-4" />}
            {locked ? "Accepted and locked" : "Awaiting signature"}
          </div>
        </div>

        <QuoteDocument
          snapshot={view.quote}
          headerSuffix={`version ${view.versionNumber}`}
          clientSignatures={clientSignatures}
        />

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <section>
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
                loading={pendingAction === "accept"}
                loadingText="Accepting..."
                onClick={() =>
                  void runPendingAction(
                    "accept",
                    acceptQuote,
                    "Could not accept quote.",
                  )
                }
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
                disabled={isPending}
                loading={pendingAction === "refresh"}
                loadingText="Refreshing..."
                onClick={() =>
                  void runPendingAction(
                    "refresh",
                    refreshView,
                    "Could not refresh quote.",
                  )
                }
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
          onUploaded={() =>
            void runPendingAction(
              "refresh",
              refreshView,
              "Could not refresh quote.",
            )
          }
        />
      ) : null}
    </main>
  );
}
