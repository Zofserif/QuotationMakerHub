"use client";

import { useId, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  FileSignature,
  Lock,
  MessageSquareWarning,
  RefreshCw,
  X,
} from "lucide-react";

import { QuoteDocument } from "@/components/quote-editor/quote-document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const initialRecipientTerminal =
    Boolean(initialView.recipient.lockedAt) ||
    ["accepted", "rejected", "expired"].includes(
      initialView.recipient.status,
    );
  const [view, setView] = useState(initialView);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    initialRecipientTerminal ? null : initialSignatureFieldId,
  );
  const [typedName, setTypedName] = useState(initialView.recipient.name);
  const [rejectionComment, setRejectionComment] = useState(
    initialView.recipient.rejectionComment ?? "",
  );
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "accept" | "reject" | "refresh" | null
  >(null);
  const isPending = pendingAction !== null;
  const allSigned = view.requiredSignatureFields.every(
    (field) => field.status === "signed",
  );
  const locked = Boolean(view.recipient.lockedAt);
  const accepted = view.recipient.status === "accepted";
  const rejected = view.recipient.status === "rejected";
  const terminal =
    locked ||
    rejected ||
    accepted ||
    view.recipient.status === "expired";
  const trimmedRejectionComment = rejectionComment.trim();
  const rejectDialogTitleId = useId();
  const rejectDialogDescriptionId = useId();
  const clientSignatures = view.requiredSignatureFields.map((field) => ({
    field,
    recipient: view.recipient,
    placement: field.placement,
    signatureAsset: field.signatureAsset,
  }));

  function openSignatureField(signatureFieldId: string) {
    if (terminal) {
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
      setRejectionComment(payload.recipient?.rejectionComment ?? "");
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

  async function rejectQuote() {
    setMessage(null);
    const response = await fetch(`/api/client-link/${token}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: trimmedRejectionComment,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not reject quotation.");
      return;
    }

    setRejectionComment(payload.rejectionComment ?? trimmedRejectionComment);
    setMessage(`Rejected at ${formatDate(payload.rejectedAt)}.`);
    setRejectDialogOpen(false);
    await refreshView();
  }

  async function runPendingAction(
    action: "accept" | "reject" | "refresh",
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
            {locked || accepted ? (
              <Lock className="size-4" />
            ) : rejected ? (
              <CircleX className="size-4" />
            ) : (
              <FileSignature className="size-4" />
            )}
            {locked || accepted
              ? "Accepted and locked"
              : rejected
                ? "Rejected"
                : "Awaiting signature"}
          </div>
        </div>

        <QuoteDocument
          snapshot={view.quote}
          headerSuffix={`version ${view.versionNumber}`}
          clientSignatures={clientSignatures}
          variant="client"
        />

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <section>
            <h2 className="font-semibold text-stone-950">Required signatures</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {view.requiredSignatureFields.map((field) => (
                <a
                  aria-disabled={terminal}
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
                  {!terminal && field.status !== "signed" ? (
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
                  disabled={terminal}
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  disabled={!allSigned || !confirmed || terminal || isPending}
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
                <Button
                  aria-haspopup="dialog"
                  type="button"
                  variant="danger"
                  disabled={terminal || isPending}
                  onClick={() => {
                    setMessage(null);
                    setRejectDialogOpen(true);
                  }}
                >
                  <CircleX className="size-4" />
                  Reject quotation
                </Button>
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-stone-700">
              <input
                checked={confirmed}
                className="mt-1 size-4"
                disabled={terminal}
                type="checkbox"
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                I have reviewed the quotation and agree to the terms for this
                version.
              </span>
            </label>
            {rejected ? (
              <p className="mt-4 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Rejected
                {view.recipient.rejectedAt
                  ? ` ${formatDate(view.recipient.rejectedAt)}`
                  : ""}
                {view.recipient.rejectionComment
                  ? `: ${view.recipient.rejectionComment}`
                  : ""}
              </p>
            ) : null}

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

      {rejectDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4">
          <section
            aria-describedby={rejectDialogDescriptionId}
            aria-labelledby={rejectDialogTitleId}
            aria-modal="true"
            className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquareWarning className="size-4 text-stone-500" />
                  <h2
                    className="font-semibold text-stone-950"
                    id={rejectDialogTitleId}
                  >
                    Reject quotation
                  </h2>
                </div>
                <p
                  className="mt-1 text-sm leading-6 text-stone-500"
                  id={rejectDialogDescriptionId}
                >
                  Send the changes needed before this quotation can be accepted.
                </p>
              </div>
              <Button
                aria-label="Close rejection dialog"
                disabled={pendingAction === "reject"}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setRejectDialogOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </header>

            <div className="space-y-4 p-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-stone-800">
                  What needs to be changed?
                </span>
                <Textarea
                  autoFocus
                  disabled={pendingAction === "reject"}
                  maxLength={4000}
                  value={rejectionComment}
                  onChange={(event) =>
                    setRejectionComment(event.target.value)
                  }
                />
              </label>
              {message ? (
                <p className="text-sm text-stone-600">{message}</p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pendingAction === "reject"}
                  onClick={() => setRejectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={
                    terminal ||
                    pendingAction === "reject" ||
                    trimmedRejectionComment.length === 0
                  }
                  loading={pendingAction === "reject"}
                  loadingText="Sending..."
                  onClick={() =>
                    void runPendingAction(
                      "reject",
                      rejectQuote,
                      "Could not reject quotation.",
                    )
                  }
                >
                  <CircleX className="size-4" />
                  Send changes
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
