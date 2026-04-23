import { notFound } from "next/navigation";

import { requireQuoter } from "@/lib/auth/require-quoter";
import { getQuote, listQuoteVersions } from "@/lib/quotes/persistence";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PrintQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { quoteId } = await params;
  const { version } = await searchParams;
  const quoter = await requireQuoter();
  const quote = await getQuote(quoter, quoteId);

  if (!quote) {
    notFound();
  }

  const versions = await listQuoteVersions(quoter, quote.id);
  const selectedVersion =
    versions.find((candidate) => String(candidate.versionNumber) === version) ??
    versions.at(-1);
  const snapshot = selectedVersion?.snapshot;

  if (!snapshot) {
    notFound();
  }

  return (
    <main className="bg-white p-8 text-stone-950 print:p-0">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-start justify-between border-b border-stone-300 pb-6">
          <div>
            <p className="text-sm font-semibold text-stone-500">
              {snapshot.quoteNumber} · version {selectedVersion.versionNumber}
            </p>
            <h1 className="mt-2 text-4xl font-bold">{snapshot.title}</h1>
            <p className="mt-2 text-sm text-stone-600">
              Valid until {formatDate(snapshot.validUntil)}
            </p>
          </div>
          <div className="text-right text-sm text-stone-600">
            <p className="font-semibold text-stone-950">
              {snapshot.business.name}
            </p>
            <p>{snapshot.business.email}</p>
            <p>{snapshot.business.address}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-stone-300 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase text-stone-500">
              Client
            </h2>
            <p className="mt-2 font-semibold">
              {snapshot.client.companyName || snapshot.client.contactName}
            </p>
            <p>{snapshot.client.contactName}</p>
            <p>{snapshot.client.email}</p>
          </div>
          <div className="space-y-2">
            <TotalRow
              label="Subtotal"
              value={formatMoney(snapshot.subtotalMinor, snapshot.currency)}
            />
            <TotalRow
              label="Discount"
              value={`-${formatMoney(snapshot.discountMinor, snapshot.currency)}`}
            />
            <TotalRow
              label="Tax"
              value={formatMoney(snapshot.taxMinor, snapshot.currency)}
            />
            <TotalRow
              label="Total"
              value={formatMoney(snapshot.totalMinor, snapshot.currency)}
              strong
            />
          </div>
        </section>

        <section className="py-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                <th className="py-2">Item</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.lineItems.map((lineItem) => (
                <tr className="border-b border-stone-200" key={lineItem.id}>
                  <td className="py-3">
                    <p className="font-medium">{lineItem.name}</p>
                    <p className="text-stone-500">{lineItem.description}</p>
                  </td>
                  <td className="py-3">{lineItem.quantity}</td>
                  <td className="py-3">
                    {formatMoney(lineItem.unitPriceMinor, snapshot.currency)}
                  </td>
                  <td className="py-3 text-right font-medium">
                    {formatMoney(lineItem.lineTotalMinor, snapshot.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid gap-6 border-t border-stone-300 py-6 sm:grid-cols-2">
          <div>
            <h2 className="font-semibold">Terms</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
              {snapshot.terms}
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
              {snapshot.notes}
            </p>
          </div>
        </section>

        <section className="border-t border-stone-300 pt-6">
          <h2 className="font-semibold">Acceptance metadata</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {quote.recipients.map((recipient) => (
              <div className="rounded-md border border-stone-200 p-3" key={recipient.id}>
                <dt className="font-medium">{recipient.name}</dt>
                <dd className="text-stone-600">{recipient.email}</dd>
                <dd className="mt-2">
                  Status: {recipient.status}
                  {recipient.acceptedAt
                    ? ` · accepted ${formatDate(recipient.acceptedAt)}`
                    : ""}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 break-all text-xs text-stone-500">
            Snapshot SHA-256: {selectedVersion.snapshotSha256}
          </p>
        </section>
      </div>
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
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-stone-600"}>{label}</span>
      <span className={strong ? "text-2xl font-bold" : ""}>{value}</span>
    </div>
  );
}
