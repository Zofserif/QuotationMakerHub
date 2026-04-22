import { ExternalLink, PenLine } from "lucide-react";

import type { QuoteRecipient, SignatureField } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

export function SignatureFieldConfig({
  fields,
  recipients = [],
}: {
  fields: SignatureField[];
  recipients?: QuoteRecipient[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const recipient = recipients.find(
          (candidate) => candidate.id === field.recipientId,
        );
        const href = recipient?.accessToken
          ? `/sign/${recipient.accessToken}`
          : undefined;
        const content = (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PenLine className="size-4 text-stone-500" />
                <p className="font-medium text-stone-950">{field.label}</p>
              </div>
              {href ? <ExternalLink className="size-4 text-stone-500" /> : null}
            </div>
            <p className="mt-2 text-sm text-stone-500">
              {field.signerType === "client" ? "Client" : "Quoter"} ·{" "}
              {field.required ? "Required" : "Optional"} · {field.anchorKey}
            </p>
            {recipient ? (
              <p className="mt-3 text-sm font-medium text-stone-700">
                {href
                  ? `Open signing page for ${recipient.email}`
                  : `Send the quote to generate a signing link for ${recipient.email}`}
              </p>
            ) : null}
          </>
        );

        return href ? (
          <a
            className="touch-manipulation rounded-lg border border-dashed border-stone-300 bg-white p-4 text-left transition hover:border-stone-500 hover:bg-stone-50"
            href={href}
            key={field.id}
          >
            {content}
          </a>
        ) : (
          <div
            className={cn(
              "rounded-lg border border-dashed border-stone-300 bg-white p-4",
              field.signerType === "client" && "opacity-80",
            )}
            key={field.id}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
