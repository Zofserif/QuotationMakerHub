"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { isQuoteShareable } from "@/lib/quotes/share-links";
import type {
  QuoteShareLink,
  QuoteStatus,
  UnavailableQuoteShareLink,
} from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

type QuoteSharePanelProps = {
  quoteId?: string;
  quoteStatus: QuoteStatus;
  initialShareLinks?: QuoteShareLink[];
  initialUnavailableShareLinks?: UnavailableQuoteShareLink[];
  variant?: "panel" | "compact";
  className?: string;
  title?: string;
};

type ShareLinksPayload = {
  status?: QuoteStatus;
  shareLinks?: QuoteShareLink[];
  unavailableShareLinks?: UnavailableQuoteShareLink[];
  error?: {
    message?: string;
  };
};

export function QuoteSharePanel({
  quoteId,
  quoteStatus,
  initialShareLinks = [],
  initialUnavailableShareLinks = [],
  variant = "panel",
  className,
  title = "Client signing links",
}: QuoteSharePanelProps) {
  const origin = useClientOrigin();
  const [ensuredStatus, setEnsuredStatus] = useState<QuoteStatus | null>(null);
  const [generatedShareLinks, setGeneratedShareLinks] = useState<
    QuoteShareLink[] | null
  >(null);
  const [generatedUnavailableShareLinks, setGeneratedUnavailableShareLinks] =
    useState<UnavailableQuoteShareLink[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const status = ensuredStatus ?? quoteStatus;
  const shareLinks = generatedShareLinks ?? initialShareLinks;
  const unavailableShareLinks =
    generatedUnavailableShareLinks ?? initialUnavailableShareLinks;
  const hasLinks = shareLinks.length > 0;
  const hasUnavailableLinks = unavailableShareLinks.length > 0;
  const hasIssuedLinks = hasLinks || hasUnavailableLinks;
  const canGenerate = Boolean(
    quoteId && isQuoteShareable(status) && !hasIssuedLinks,
  );
  const description = resolveDescription({
    canGenerate,
    hasLinks,
    hasUnavailableLinks,
    status,
  });

  async function generateShareLinks() {
    if (!quoteId) {
      return;
    }

    setIsGenerating(true);

    try {
      setMessage(null);
      const response = await fetch(`/api/quotes/${quoteId}/share-links`, {
        method: "POST",
      });
      const payload = (await response.json()) as ShareLinksPayload;

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Could not generate share links.");
        return;
      }

      setEnsuredStatus(payload.status ?? status);
      setGeneratedShareLinks(payload.shareLinks ?? []);
      setGeneratedUnavailableShareLinks(payload.unavailableShareLinks ?? []);
      setMessage(
        payload.shareLinks?.length
          ? "Signing link ready."
          : "Existing customer link remains valid but cannot be displayed.",
      );
    } catch {
      setMessage("Could not generate share links.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyToClipboard(url: string, key: string) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        fallbackCopy(url);
      }
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      fallbackCopy(url);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    }
  }

  const content = (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm leading-6 text-stone-600">{description}</p>
        {canGenerate ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isGenerating}
            loading={isGenerating}
            loadingText="Generating..."
            className="shrink-0"
            onClick={() => void generateShareLinks()}
          >
            <Send className="size-4" />
            Generate link
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
          {message}
        </p>
      ) : null}

      {hasLinks ? (
        <div className="space-y-3">
          {shareLinks.map((shareLink) => {
            const absoluteUrl = absoluteShareUrl(origin, shareLink.signingPath);
            const copied = copiedKey === shareLink.recipientId;

            return (
              <div
                className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                key={shareLink.recipientId}
              >
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">
                      {shareLink.name || "Manual signing link"}
                    </p>
                    <p className="text-xs text-stone-500">
                      {shareLink.email || "No client email"} · No auto-expiry
                    </p>
                  </div>
                  <input
                    readOnly
                    className="h-10 w-full rounded-md border border-stone-200 bg-stone-50 px-3 text-sm text-stone-700 outline-none"
                    value={absoluteUrl}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        void copyToClipboard(absoluteUrl, shareLink.recipientId)
                      }
                    >
                      {copied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        window.open(
                          absoluteUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <ExternalLink className="size-4" />
                      Open
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-md border border-stone-200 bg-stone-50 p-3">
                  <QRCodeSVG
                    value={absoluteUrl}
                    size={variant === "compact" ? 112 : 148}
                    marginSize={2}
                    title={`QR code for ${shareLink.name || "signing link"}`}
                  />
                  <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
                    <QrCode className="size-3.5" />
                    Scan to sign
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasUnavailableLinks ? (
        <div className="space-y-3">
          {unavailableShareLinks.map((shareLink) => (
            <div
              className="rounded-lg border border-stone-200 bg-stone-50 p-3"
              key={shareLink.recipientId}
            >
              <p className="text-sm font-semibold text-stone-950">
                {shareLink.name || "Manual signing link"}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {shareLink.email || "No client email"}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Existing customer link remains valid, but this older quote does
                not store the original URL. It cannot be displayed or refreshed.
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (variant === "compact") {
    return (
      <details
        className={cn(
          "group rounded-lg border border-stone-200 bg-stone-50",
          className,
        )}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-stone-900">
          <span className="flex items-center gap-2">
            <Send className="size-4 text-stone-500" />
            Share quote
          </span>
          <span className="text-xs font-medium text-stone-500">
            {resolveSummaryLabel({
              canGenerate,
              hasLinks,
              hasUnavailableLinks,
            })}
          </span>
        </summary>
        <div className="border-t border-stone-200 bg-white p-3">{content}</div>
      </details>
    );
  }

  return (
    <section
      className={cn("rounded-lg border border-stone-200 bg-white p-4", className)}
    >
      <div className="mb-3 flex items-center gap-2">
        <Send className="size-4 text-stone-500" />
        <h3 className="font-semibold text-stone-950">{title}</h3>
      </div>
      {content}
    </section>
  );
}

function resolveDescription(input: {
  canGenerate: boolean;
  hasLinks: boolean;
  hasUnavailableLinks: boolean;
  status: QuoteStatus;
}) {
  if (input.hasLinks) {
    return "Copy the full signing URL or let the client scan the QR code.";
  }

  if (input.hasUnavailableLinks) {
    return "An existing customer link remains valid, but this older quote does not store the original URL.";
  }

  if (input.canGenerate) {
    return "Generate the client signing link when you are ready to share this quote.";
  }

  if (input.status === "locked") {
    return "This quote is locked. Share the final PDF instead of a signing link.";
  }

  return "Save, sign, and send first to generate a client signing link.";
}

function resolveSummaryLabel(input: {
  canGenerate: boolean;
  hasLinks: boolean;
  hasUnavailableLinks: boolean;
}) {
  if (input.hasLinks) {
    return "Link ready";
  }

  if (input.hasUnavailableLinks) {
    return "Existing link";
  }

  return input.canGenerate ? "Generate" : "Unavailable";
}

function absoluteShareUrl(origin: string, signingPath: string) {
  if (!origin) {
    return signingPath;
  }

  return new URL(signingPath, origin).toString();
}

function fallbackCopy(value: string) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function useClientOrigin() {
  return useSyncExternalStore(
    subscribeToOriginStore,
    getClientOrigin,
    getServerOrigin,
  );
}

function subscribeToOriginStore() {
  return () => {};
}

function getClientOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return "";
}
