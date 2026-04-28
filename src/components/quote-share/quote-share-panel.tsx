"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  RefreshCw,
  Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { isQuoteShareable } from "@/lib/quotes/share-links";
import type {
  QuoteShareLink,
  QuoteStatus,
} from "@/lib/quotes/types";
import { cn, formatDate } from "@/lib/utils";

type QuoteSharePanelProps = {
  quoteId?: string;
  quoteStatus: QuoteStatus;
  initialShareLinks?: QuoteShareLink[];
  variant?: "panel" | "compact";
  className?: string;
  title?: string;
};

type ShareLinksPayload = {
  status?: QuoteStatus;
  shareLinks?: QuoteShareLink[];
  error?: {
    message?: string;
  };
};

export function QuoteSharePanel({
  quoteId,
  quoteStatus,
  initialShareLinks = [],
  variant = "panel",
  className,
  title = "Client signing links",
}: QuoteSharePanelProps) {
  const origin = useClientOrigin();
  const [rotatedStatus, setRotatedStatus] = useState<QuoteStatus | null>(null);
  const [generatedShareLinks, setGeneratedShareLinks] = useState<
    QuoteShareLink[] | null
  >(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const status = rotatedStatus ?? quoteStatus;
  const shareLinks = generatedShareLinks ?? initialShareLinks;
  const hasLinks = shareLinks.length > 0;
  const canRefresh = Boolean(quoteId && isQuoteShareable(status));
  const description = resolveDescription({
    canRefresh,
    hasLinks,
    status,
  });

  async function refreshShareLinks() {
    if (!quoteId) {
      return;
    }

    setIsRefreshing(true);

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

      setRotatedStatus(payload.status ?? status);
      setGeneratedShareLinks(payload.shareLinks ?? []);
      setMessage("Fresh signing link generated. Previous links no longer work.");
    } catch {
      setMessage("Could not generate share links.");
    } finally {
      setIsRefreshing(false);
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
        {canRefresh ? (
          <Button
            type="button"
            variant={hasLinks ? "secondary" : "primary"}
            size="sm"
            disabled={isRefreshing}
            loading={isRefreshing}
            loadingText={hasLinks ? "Refreshing..." : "Generating..."}
            className="shrink-0"
            onClick={() => void refreshShareLinks()}
          >
            <RefreshCw className="size-4" />
            {hasLinks ? "Refresh link" : "Generate link"}
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
                      {shareLink.email || "No client email"} · Expires{" "}
                      {formatDate(shareLink.accessTokenExpiresAt)}
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
            {hasLinks ? "Link ready" : canRefresh ? "Generate" : "Unavailable"}
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
  canRefresh: boolean;
  hasLinks: boolean;
  status: QuoteStatus;
}) {
  if (input.hasLinks) {
    return "Copy the full signing URL or let the client scan the QR code.";
  }

  if (input.canRefresh) {
    return "Generate a fresh signing link when you are ready to share this quote. Refreshing invalidates previously generated links.";
  }

  if (input.status === "locked") {
    return "This quote is locked. Share the final PDF instead of a signing link.";
  }

  return "Save, sign, and send first to generate a client signing link.";
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
