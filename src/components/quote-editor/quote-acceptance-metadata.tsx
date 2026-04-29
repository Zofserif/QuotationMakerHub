import { FileCheck2 } from "lucide-react";

import type { Quote } from "@/lib/quotes/types";
import { formatDate } from "@/lib/utils";

export function QuoteAcceptanceMetadata({
  recipients,
  versionNumber,
  snapshotSha256,
}: {
  recipients: Quote["recipients"];
  versionNumber?: number;
  snapshotSha256?: string;
}) {
  return (
    <section className="bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
      <div className="mb-3 flex items-center gap-2">
        <FileCheck2 className="size-4 text-stone-500" />
        <h2 className="font-semibold text-stone-950">Acceptance metadata</h2>
      </div>

      {recipients.length > 0 ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {recipients.map((recipient) => (
            <div
              className="rounded-md border border-stone-200 p-3"
              key={recipient.id}
            >
              <dt className="font-medium text-stone-950">{recipient.name}</dt>
              <dd className="text-stone-600">{recipient.email}</dd>
              <dd className="mt-2 text-stone-900">
                Status: {formatRecipientStatus(recipient.status)}
              </dd>
              <dd className="text-stone-600">
                {recipient.acceptedAt
                  ? `Accepted ${formatDate(recipient.acceptedAt)}`
                  : "Not accepted"}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-stone-600">No recipients configured.</p>
      )}

      {versionNumber || snapshotSha256 ? (
        <div className="mt-6 space-y-2 text-xs text-stone-500">
          {versionNumber ? <p>Quote version: {versionNumber}</p> : null}
          {snapshotSha256 ? (
            <p className="break-all">Snapshot SHA-256: {snapshotSha256}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatRecipientStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
