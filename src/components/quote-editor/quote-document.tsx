import type { ReactNode } from "react";

import { MarkdownText } from "@/components/ui/markdown-text";
import { QuoteTotalsView } from "@/components/quote-editor/quote-totals";
import { getLineItemImageSrc } from "@/lib/line-item-data/images";
import type { QuoteSignatureMode } from "@/lib/quotes/print-options";
import type {
  QuoteDocumentSignature,
  QuoteVersionSnapshot,
} from "@/lib/quotes/types";
import { cn, formatDate, formatMoney, formatQuoteIssuedDate } from "@/lib/utils";

export function QuoteDocument({
  snapshot,
  headerSuffix,
  clientSignatures,
  signatureMode = "electronic",
  variant = "preview",
}: {
  snapshot: QuoteVersionSnapshot;
  headerSuffix?: string;
  clientSignatures?: QuoteDocumentSignature[];
  signatureMode?: QuoteSignatureMode;
  variant?: "preview" | "print" | "client";
}) {
  const template = snapshot.template;
  const offerTitle = snapshot.title.trim();
  const showOfferTitle = (template?.offerTitle.enabled ?? true) && Boolean(offerTitle);
  const showRequestSummary = template?.requestSummary.enabled ?? Boolean(snapshot.requestSummary);
  const showItemNumber = template?.lineItems.showItemNumber ?? true;
  const showDescriptionPicture = template?.lineItems.showDescriptionPicture ?? false;
  const showQuantity = template?.lineItems.showQuantity ?? true;
  const showUnit = template?.lineItems.unit.enabled ?? true;
  const showQuoteNumber = template?.company.showQuoteNumber ?? true;
  const vatEnabled = template?.lineItems.vat.enabled ?? false;
  const taxMode = vatEnabled ? (template?.lineItems.vat.mode ?? "exclusive") : "exclusive";
  const showVat = vatEnabled && taxMode === "exclusive";
  const moneyDisplay = template?.lineItems.unitPrice.display ?? "symbol";
  const itemNumberLabel = "Item #";
  const renderedClientSignatures =
    clientSignatures ?? createUnsignedClientSignatures(snapshot);
  const wetSignatureMode = signatureMode === "wet";
  const isPrint = variant === "print";
  const usesClientDocumentLayout = isPrint || variant === "client";
  const lineItemHeaderCellClassName = usesClientDocumentLayout
    ? "py-3"
    : undefined;
  const lineItemBodyCellClassName = usesClientDocumentLayout
    ? "py-4"
    : undefined;
  const lineItemGridColumns = [
    showItemNumber ? "80px" : null,
    "minmax(0, 1.8fr)",
    showQuantity ? "90px" : null,
    showUnit ? "110px" : null,
    "120px",
    showVat ? "110px" : null,
    "120px",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn(
        "bg-white p-6 sm:p-8",
        isPrint ? "print:p-0" : "shadow-sm ring-1 ring-stone-200",
      )}
    >
      <header className="border-b border-stone-200 pb-6">
        {usesClientDocumentLayout && snapshot.business.logoDataUrl ? (
          <div className="flex justify-center pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Company logo"
              className="h-24 w-64 object-contain"
              src={snapshot.business.logoDataUrl}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div>
              {showQuoteNumber ? (
                <p className="text-sm font-medium text-stone-500">
                  {snapshot.quoteNumber}
                  {headerSuffix ? ` · ${headerSuffix}` : ""}
                </p>
              ) : null}
              {showOfferTitle ? (
                <h1
                  className={cn(
                    "text-3xl font-bold text-stone-950",
                    showQuoteNumber ? "mt-2" : "",
                  )}
                >
                  {offerTitle}
                </h1>
              ) : null}
            </div>
            <dl className="grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
              <DocumentMeta
                label={template?.company.dateLabel || "Date"}
                value={formatQuoteIssuedDate(snapshot.issuedAt)}
              />
              <DocumentMeta
                label="Quotation Validity"
                value={formatDate(snapshot.validUntil)}
              />
            </dl>
          </div>

          <div className="text-sm text-stone-600 sm:max-w-xs sm:text-right">
            {!usesClientDocumentLayout && snapshot.business.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Company logo"
                className="mb-3 h-16 w-full object-contain sm:ml-auto sm:w-40"
                src={snapshot.business.logoDataUrl}
              />
            ) : null}
            {snapshot.business.name ? (
              <p className="font-semibold text-stone-950">{snapshot.business.name}</p>
            ) : null}
            <p>{snapshot.business.address}</p>
            {snapshot.business.telephone ? <p>{snapshot.business.telephone}</p> : null}
            {snapshot.business.phone ? <p>{snapshot.business.phone}</p> : null}
            {snapshot.business.email ? <p>{snapshot.business.email}</p> : null}
            {snapshot.business.vatRegTin ? <p>{snapshot.business.vatRegTin}</p> : null}
          </div>
        </div>
      </header>

      <section className="grid gap-6 border-b border-stone-200 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Customer Information
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            <DocumentMeta
              label={template?.customer.clientNameLabel || "Client Name"}
              value={snapshot.client.contactName || "Not set"}
            />
            {(template?.customer.clientCompany.enabled ?? true) ? (
              <DocumentMeta
                label={template?.customer.clientCompany.value || "Client Company"}
                value={snapshot.client.companyName || "Not set"}
              />
            ) : null}
            {(template?.customer.address.enabled ?? true) ? (
              <DocumentMeta
                label={template?.customer.address.value || "Address"}
                value={snapshot.client.address || "Not set"}
              />
            ) : null}
            {(template?.customer.email.enabled ?? true) ? (
              <DocumentMeta
                label={template?.customer.email.value || "Email"}
                value={snapshot.client.email || "Not set"}
              />
            ) : null}
            {(template?.customer.contactNumber.enabled ?? true) ? (
              <DocumentMeta
                label={template?.customer.contactNumber.value || "Contact #"}
                value={snapshot.client.phone || "Not set"}
              />
            ) : null}
          </div>
        </div>

        <QuoteTotalsView
          totals={snapshot}
          currency={snapshot.currency}
          taxEnabled={vatEnabled}
          taxMode={taxMode}
          moneyDisplay={moneyDisplay}
        />
      </section>

      {showRequestSummary && snapshot.requestSummary ? (
        <section className="border-b border-stone-200 py-6">
          {!usesClientDocumentLayout ? (
            <h2 className="font-semibold text-stone-950">Request Summary</h2>
          ) : null}
          <MarkdownText
            className={cn(
              "text-sm leading-6 text-stone-600",
              !usesClientDocumentLayout ? "mt-3" : null,
            )}
            value={snapshot.requestSummary}
          />
        </section>
      ) : null}

      <section className="py-6">
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <div
            className={cn(
              "grid bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500",
              usesClientDocumentLayout ? "gap-0 px-0" : "gap-4 px-4 py-3",
            )}
            style={{
              gridTemplateColumns: lineItemGridColumns,
            }}
          >
            {showItemNumber ? (
              <LineItemCell
                bordered={usesClientDocumentLayout}
                className={lineItemHeaderCellClassName}
              >
                {itemNumberLabel}
              </LineItemCell>
            ) : null}
            <LineItemCell
              bordered={usesClientDocumentLayout}
              className={lineItemHeaderCellClassName}
            >
              Description
            </LineItemCell>
            {showQuantity ? (
              <LineItemCell
                bordered={usesClientDocumentLayout}
                className={lineItemHeaderCellClassName}
              >
                Quantity
              </LineItemCell>
            ) : null}
            {showUnit ? (
              <LineItemCell
                bordered={usesClientDocumentLayout}
                className={lineItemHeaderCellClassName}
              >
                Unit
              </LineItemCell>
            ) : null}
            <LineItemCell
              bordered={usesClientDocumentLayout}
              className={lineItemHeaderCellClassName}
            >
              Unit Price
            </LineItemCell>
            {showVat ? (
              <LineItemCell
                bordered={usesClientDocumentLayout}
                className={lineItemHeaderCellClassName}
              >
                VAT
              </LineItemCell>
            ) : null}
            <LineItemCell
              bordered={usesClientDocumentLayout}
              className={cn(lineItemHeaderCellClassName, "text-right")}
            >
              Line Total
            </LineItemCell>
          </div>
          <div className="divide-y divide-stone-200">
            {snapshot.lineItems.map((lineItem, index) => {
              const imageSrc = getLineItemImageSrc(lineItem);
              const vatLabel = showVat
                ? `${Math.round(lineItem.taxRate * 10000) / 100}% excl.`
                : null;

              return (
                <div
                  className={cn(
                    "grid text-sm",
                    usesClientDocumentLayout ? "gap-0 px-0" : "gap-4 px-4 py-4",
                  )}
                  key={lineItem.id}
                  style={{
                    gridTemplateColumns: lineItemGridColumns,
                  }}
                >
                  {showItemNumber ? (
                    <LineItemCell
                      bordered={usesClientDocumentLayout}
                      className={cn(
                        lineItemBodyCellClassName,
                        "font-medium text-stone-500",
                      )}
                    >
                      {index + 1}
                    </LineItemCell>
                  ) : null}
                  <LineItemCell
                    bordered={usesClientDocumentLayout}
                    className={lineItemBodyCellClassName}
                  >
                    {showDescriptionPicture && imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="mb-3 h-28 w-full rounded-md border border-stone-200 object-cover"
                        src={imageSrc}
                      />
                    ) : null}
                    <p className="font-medium text-stone-950">{lineItem.name}</p>
                    <MarkdownText
                      className="mt-1 text-stone-500"
                      value={lineItem.description}
                    />
                  </LineItemCell>
                  {showQuantity ? (
                    <LineItemCell
                      bordered={usesClientDocumentLayout}
                      className={lineItemBodyCellClassName}
                    >
                      {lineItem.quantity}
                    </LineItemCell>
                  ) : null}
                  {showUnit ? (
                    <LineItemCell
                      bordered={usesClientDocumentLayout}
                      className={lineItemBodyCellClassName}
                    >
                      {lineItem.unit || "Unit"}
                    </LineItemCell>
                  ) : null}
                  <LineItemCell
                    bordered={usesClientDocumentLayout}
                    className={lineItemBodyCellClassName}
                  >
                    {formatMoney(lineItem.unitPriceMinor, snapshot.currency, moneyDisplay)}
                  </LineItemCell>
                  {showVat ? (
                    <LineItemCell
                      bordered={usesClientDocumentLayout}
                      className={lineItemBodyCellClassName}
                    >
                      {vatLabel}
                    </LineItemCell>
                  ) : null}
                  <LineItemCell
                    bordered={usesClientDocumentLayout}
                    className={cn(
                      lineItemBodyCellClassName,
                      "text-right font-semibold",
                    )}
                  >
                    {formatMoney(lineItem.lineTotalMinor, snapshot.currency, moneyDisplay)}
                  </LineItemCell>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className={cn(
          "grid gap-6 border-t border-stone-200 py-6",
          !usesClientDocumentLayout ? "md:grid-cols-2" : null,
        )}
      >
        <DocumentTextBlock
          title="Payment Terms"
          value={snapshot.terms || template?.paymentTerms}
        />
        <DocumentTextBlock
          title="Terms & Conditions"
          value={snapshot.notes || template?.termsAndConditions}
        />
      </section>

      <section className="grid gap-6 border-t border-stone-200 py-6 md:grid-cols-2">
        <div>
          <h2 className="font-semibold text-stone-950">
            {usesClientDocumentLayout ? "Confirmed by:" : "Client signature"}
          </h2>
          <div className="mt-4 grid gap-3">
            {renderedClientSignatures.length > 0 ? (
              renderedClientSignatures.map((signature) => {
                const recipientName =
                  signature.recipient?.name || snapshot.client.contactName || "Client";

                return (
                  <SignatureCard
                    key={signature.field.id}
                    alt={`${signature.field.label || "Client"} signature`}
                    imageUrl={
                      wetSignatureMode
                        ? undefined
                        : signature.signatureAsset?.dataUrl
                    }
                    blankSignature={wetSignatureMode}
                    placeholder="Awaiting signature"
                    primaryText={wetSignatureMode ? undefined : recipientName}
                    statusText={
                      wetSignatureMode
                        ? "Signature over printed name"
                        : signature.placement
                        ? `Signed ${formatDate(signature.placement.placedAt)}`
                        : "Awaiting signature"
                    }
                  />
                );
              })
            ) : (
              <SignatureCard
                alt="Client signature"
                blankSignature={wetSignatureMode}
                placeholder="Awaiting signature"
                primaryText={
                  wetSignatureMode
                    ? undefined
                    : snapshot.client.contactName || "Client"
                }
                statusText={
                  wetSignatureMode
                    ? "Signature over printed name"
                    : "Awaiting signature"
                }
              />
            )}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-stone-950">
            {usesClientDocumentLayout ? "Prepared by:" : "Quoter signature"}
          </h2>
          <SignatureCard
            className="mt-4"
            alt="Quoter signature"
            imageUrl={
              wetSignatureMode
                ? undefined
                : snapshot.quoterSignature?.asset?.dataUrl
            }
            blankSignature={wetSignatureMode}
            placeholder="No signature"
            primaryText={
              wetSignatureMode
                ? undefined
                : snapshot.quoterSignature?.printedName || "Not set"
            }
            statusText={
              wetSignatureMode
                ? "Signature over printed name"
                : formatQuoteIssuedDate(snapshot.issuedAt)
            }
          />
        </div>
      </section>

      {!usesClientDocumentLayout && template?.footer.enabled && template.footer.value ? (
        <section className="border-t border-stone-200 pt-6">
          <h2 className="font-semibold text-stone-950">Footer</h2>
          <MarkdownText
            className="mt-3 text-sm leading-6 text-stone-600"
            value={template.footer.value}
          />
        </section>
      ) : null}
    </div>
  );
}

function LineItemCell({
  bordered = false,
  children,
  className,
}: {
  bordered?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        bordered ? "border-l border-stone-200 px-3 first:border-l-0" : null,
        className,
      )}
    >
      {children}
    </div>
  );
}

function SignatureCard({
  alt,
  blankSignature = false,
  className,
  imageUrl,
  placeholder,
  primaryText,
  statusText,
}: {
  alt: string;
  blankSignature?: boolean;
  className?: string;
  imageUrl?: string;
  placeholder: string;
  primaryText?: string;
  statusText: string;
}) {
  return (
    <div
      className={["rounded-lg border border-stone-200 p-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          className="h-20 w-full object-contain"
          src={imageUrl}
        />
      ) : blankSignature ? (
        <div aria-label={alt} className="flex h-20 items-end px-4 pb-3">
          <div className="w-full border-b border-stone-400" />
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
          {placeholder}
        </div>
      )}
      {primaryText ? (
        <p className="mt-3 font-medium text-stone-950">{primaryText}</p>
      ) : null}
      <p
        className={cn(
          "text-sm text-stone-600",
          primaryText ? null : "mt-3",
        )}
      >
        {statusText}
      </p>
    </div>
  );
}

function createUnsignedClientSignatures(
  snapshot: QuoteVersionSnapshot,
): QuoteDocumentSignature[] {
  return snapshot.signatureFields
    .filter((field) => field.signerType === "client")
    .map((field) => ({
      field,
      recipient: snapshot.recipients.find(
        (recipient) => recipient.id === field.recipientId,
      ),
    }));
}

function DocumentMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-stone-900">{value}</p>
    </div>
  );
}

function DocumentTextBlock({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  return (
    <div>
      <h2 className="font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
        {value || "Not set"}
      </p>
    </div>
  );
}
