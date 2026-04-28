"use client";

import {
  Building2,
  FileImage,
  FileText,
  ListOrdered,
  PenLine,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getCurrencyDisplayName,
  normalizeCurrency,
  supportedCurrencies,
} from "@/lib/currency";
import type { QuoteTemplate, ToggleText } from "@/lib/quote-templates/types";

const logoSizeLimitBytes = 1_200_000;
const selectClassName =
  "h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-100";

export function QuoteTemplateDesigner({
  template: initialTemplate,
}: {
  template: QuoteTemplate;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState(initialTemplate);
  const [message, setMessage] = useState<string | null>(null);

  function updateCompany(patch: Partial<QuoteTemplate["company"]>) {
    setTemplate((current) => ({
      ...current,
      company: {
        ...current.company,
        ...patch,
      },
    }));
  }

  function updateCustomer(patch: Partial<QuoteTemplate["customer"]>) {
    setTemplate((current) => ({
      ...current,
      customer: {
        ...current.customer,
        ...patch,
      },
    }));
  }

  function updateLineItems(patch: Partial<QuoteTemplate["lineItems"]>) {
    setTemplate((current) => ({
      ...current,
      lineItems: {
        ...current.lineItems,
        ...patch,
      },
    }));
  }

  function updateUnitOption(index: number, value: string) {
    updateLineItems({
      unit: {
        ...template.lineItems.unit,
        options: template.lineItems.unit.options.map((option, candidateIndex) =>
          candidateIndex === index ? value : option,
        ),
      },
    });
  }

  function addUnitOption() {
    updateLineItems({
      unit: {
        ...template.lineItems.unit,
        options: [...template.lineItems.unit.options, ""],
      },
    });
  }

  function removeUnitOption(index: number) {
    updateLineItems({
      unit: {
        ...template.lineItems.unit,
        options: normalizeUnitOptions(
          template.lineItems.unit.options.filter(
            (_, candidateIndex) => candidateIndex !== index,
          ),
        ),
      },
    });
  }

  function updateLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > logoSizeLimitBytes) {
      setMessage("Logo image must be 1.2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTemplate((current) => ({
        ...current,
        logo: {
          enabled: true,
          dataUrl: String(reader.result ?? ""),
        },
      }));
      setMessage(null);
    };
    reader.readAsDataURL(file);
  }

  async function saveTemplate() {
    setMessage(null);
    const response = await fetch("/api/quote-template", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...template,
        lineItems: {
          ...template.lineItems,
          unit: {
            ...template.lineItems.unit,
            options: normalizeUnitOptions(template.lineItems.unit.options),
          },
          unitPrice: {
            ...template.lineItems.unitPrice,
            currency: normalizeCurrency(template.lineItems.unitPrice.currency),
          },
          vat: {
            ...template.lineItems.vat,
            enabled: true,
          },
        },
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Could not save quote template.");
      return;
    }

    setTemplate(payload.template);
    setMessage("Quote template saved.");
    router.refresh();
  }

  async function handleSaveTemplate() {
    setIsSaving(true);

    try {
      await saveTemplate();
    } catch {
      setMessage("Could not save quote template.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSaveTemplate();
      }}
    >
      <div className="space-y-6">
        <Section icon={FileImage} title="Branding">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm font-medium text-stone-800">
                <input
                  checked={template.logo.enabled}
                  className="size-4"
                  type="checkbox"
                  onChange={(event) =>
                    setTemplate((current) => ({
                      ...current,
                      logo: {
                        ...current.logo,
                        enabled: event.target.checked,
                      },
                    }))
                  }
                />
                Logo
              </label>
              {template.logo.dataUrl ? (
                <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Company logo"
                    className="h-24 w-full object-contain"
                    src={template.logo.dataUrl}
                  />
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                  No logo
                </div>
              )}
              <Input
                accept="image/png,image/jpeg,image/webp"
                type="file"
                onChange={updateLogoFile}
              />
              {template.logo.dataUrl ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setTemplate((current) => ({
                      ...current,
                      logo: {
                        enabled: false,
                        dataUrl: "",
                      },
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                  Remove logo
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleTextField
                label="Company name"
                value={template.company.name}
                onChange={(name) => updateCompany({ name })}
              />
              <Field label="Address">
                <Input
                  required
                  value={template.company.address}
                  onChange={(event) =>
                    updateCompany({ address: event.target.value })
                  }
                />
              </Field>
              <ToggleTextField
                label="Telephone"
                value={template.company.telephone}
                onChange={(telephone) => updateCompany({ telephone })}
              />
              <ToggleTextField
                label="Phone number"
                value={template.company.phone}
                onChange={(phone) => updateCompany({ phone })}
              />
              <ToggleTextField
                label="Email"
                type="email"
                value={template.company.email}
                onChange={(email) => updateCompany({ email })}
              />
              <ToggleTextField
                label="VAT Reg TIN"
                value={template.company.vatRegTin}
                onChange={(vatRegTin) => updateCompany({ vatRegTin })}
              />
              <Field label="Date label">
                <Input
                  required
                  value={template.company.dateLabel}
                  onChange={(event) =>
                    updateCompany({ dateLabel: event.target.value })
                  }
                />
              </Field>
              <Field label="Quotation number format">
                <Input
                  required
                  value={template.company.quoteNumberFormat}
                  onChange={(event) =>
                    updateCompany({
                      quoteNumberFormat: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section icon={UserRound} title="Customer Information">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client name label">
              <Input
                required
                value={template.customer.clientNameLabel}
                onChange={(event) =>
                  updateCustomer({ clientNameLabel: event.target.value })
                }
              />
            </Field>
            <ToggleTextField
              label="Client company"
              value={template.customer.clientCompany}
              onChange={(clientCompany) => updateCustomer({ clientCompany })}
            />
            <ToggleTextField
              label="Address"
              value={template.customer.address}
              onChange={(address) => updateCustomer({ address })}
            />
            <ToggleTextField
              label="Email"
              value={template.customer.email}
              onChange={(email) => updateCustomer({ email })}
            />
            <ToggleTextField
              label="Contact #"
              value={template.customer.contactNumber}
              onChange={(contactNumber) => updateCustomer({ contactNumber })}
            />
          </div>
        </Section>

        <Section icon={FileText} title="Quote Content">
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleTextField
              label="Title offer"
              value={template.offerTitle}
              onChange={(offerTitle) =>
                setTemplate((current) => ({ ...current, offerTitle }))
              }
            />
            <ToggleMarkdownField
              label="Request summary"
              value={template.requestSummary}
              onChange={(requestSummary) =>
                setTemplate((current) => ({ ...current, requestSummary }))
              }
            />
          </div>
        </Section>

        <Section icon={ListOrdered} title="Line Item Columns">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField
              checked={template.lineItems.showItemNumber}
              label="Item number"
              onChange={(showItemNumber) => updateLineItems({ showItemNumber })}
            />
            <CheckboxField
              checked={template.lineItems.showDescriptionPicture}
              label="Description picture"
              onChange={(showDescriptionPicture) =>
                updateLineItems({ showDescriptionPicture })
              }
            />
            <CheckboxField
              checked={template.lineItems.showQuantity}
              label="Quantity"
              onChange={(showQuantity) => updateLineItems({ showQuantity })}
            />
            <Field label="Detailed description label">
              <Input
                required
                value={template.lineItems.detailedDescriptionLabel}
                onChange={(event) =>
                  updateLineItems({
                    detailedDescriptionLabel: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Unit options">
              <div className="space-y-3">
                <label className="flex h-10 items-center gap-3 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800">
                  <input
                    checked={template.lineItems.unit.enabled}
                    className="size-4"
                    type="checkbox"
                    onChange={(event) =>
                      updateLineItems({
                        unit: {
                          ...template.lineItems.unit,
                          enabled: event.target.checked,
                        },
                      })
                    }
                  />
                  Show unit column
                </label>
                <div className="space-y-2">
                  {template.lineItems.unit.options.map((option, index) => (
                    <div
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_40px]"
                      key={index}
                    >
                      <Input
                        aria-label={`Unit option ${index + 1}`}
                        required
                        value={option}
                        onChange={(event) =>
                          updateUnitOption(index, event.target.value)
                        }
                      />
                      <Button
                        aria-label={`Remove ${option || `unit option ${index + 1}`}`}
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={template.lineItems.unit.options.length <= 1}
                        onClick={() => removeUnitOption(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addUnitOption}>
                  <Plus className="size-4" />
                  Add unit
                </Button>
              </div>
            </Field>
            <Field label="Currency">
              <select
                className={selectClassName}
                value={normalizeCurrency(template.lineItems.unitPrice.currency)}
                onChange={(event) =>
                  updateLineItems({
                    unitPrice: {
                      ...template.lineItems.unitPrice,
                      currency: normalizeCurrency(event.target.value),
                    },
                  })
                }
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unit price display">
              <select
                className={selectClassName}
                value={template.lineItems.unitPrice.display}
                onChange={(event) =>
                  updateLineItems({
                    unitPrice: {
                      ...template.lineItems.unitPrice,
                      display: event.target.value as "symbol" | "text",
                    },
                  })
                }
              >
                <option value="symbol">Symbol</option>
                <option value="text">Text</option>
              </select>
            </Field>
            <Field label="VAT">
              <div className="grid gap-2">
                <label className="flex h-10 items-center gap-3 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800">
                  <input
                    checked={template.lineItems.vat.mode === "exclusive"}
                    className="size-4"
                    type="checkbox"
                    onChange={(event) =>
                      updateLineItems({
                        vat: {
                          ...template.lineItems.vat,
                          enabled: true,
                          mode: event.target.checked
                            ? "exclusive"
                            : "inclusive",
                        },
                      })
                    }
                  />
                  VAT exclusive
                </label>
                <Input
                  aria-label="VAT rate percentage"
                  min="0"
                  max="100"
                  step="0.01"
                  type="number"
                  value={template.lineItems.vat.rate * 100}
                  onChange={(event) =>
                    updateLineItems({
                      vat: {
                        ...template.lineItems.vat,
                        enabled: true,
                        rate: Number(event.target.value || 0) / 100,
                      },
                    })
                  }
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section icon={ReceiptText} title="Terms">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Payment terms">
              <Textarea
                required
                value={template.paymentTerms}
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    paymentTerms: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Terms & conditions">
              <Textarea
                required
                value={template.termsAndConditions}
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    termsAndConditions: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </Section>

        <Section icon={PenLine} title="Signature & Footer">
          <div className="grid gap-4 md:grid-cols-2">
            <CheckboxField
              checked={template.signature.clientNameInputEnabled}
              label="Client name input"
              onChange={(clientNameInputEnabled) =>
                setTemplate((current) => ({
                  ...current,
                  signature: {
                    ...current.signature,
                    clientNameInputEnabled,
                  },
                }))
              }
            />
            <Field label="Client signature name case">
              <select
                className={selectClassName}
                value={template.signature.nameCase}
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    signature: {
                      ...current.signature,
                      nameCase: event.target.value as "uppercase" | "title",
                    },
                  }))
                }
              >
                <option value="title">Title Case</option>
                <option value="uppercase">CAPITALIZE CASE</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <ToggleMarkdownField
                label="Footer"
                value={template.footer}
                onChange={(footer) =>
                  setTemplate((current) => ({ ...current, footer }))
                }
              />
            </div>
          </div>
        </Section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-950">Quote Template</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <SummaryRow
              label="Number format"
              value={template.company.quoteNumberFormat}
            />
            <SummaryRow
              label="Currency"
              value={getCurrencyDisplayName(template.lineItems.unitPrice.currency)}
            />
            <SummaryRow
              label="VAT"
              value={`${Math.round(template.lineItems.vat.rate * 10000) / 100}% ${
                template.lineItems.vat.mode
              }`}
            />
            <SummaryRow
              label="Logo"
              value={template.logo.enabled ? "On" : "Off"}
            />
          </dl>
        </div>

        <div className="sticky top-6 rounded-lg border border-stone-200 bg-white p-4">
          <Button
            className="w-full"
            type="submit"
            disabled={isSaving}
            loading={isSaving}
            loadingText="Saving..."
          >
            <Save className="size-4" />
            Save template
          </Button>
          {message ? (
            <p className="mt-3 text-sm font-medium text-stone-600">{message}</p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}

function ToggleTextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: ToggleText;
  onChange: (value: ToggleText) => void;
  type?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          checked={value.enabled}
          className="size-4"
          type="checkbox"
          onChange={(event) =>
            onChange(updateToggleText(value, { enabled: event.target.checked }))
          }
        />
        <Input
          type={type}
          value={value.value}
          onChange={(event) =>
            onChange(updateToggleText(value, { value: event.target.value }))
          }
        />
      </div>
    </Field>
  );
}

function ToggleMarkdownField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ToggleText;
  onChange: (value: ToggleText) => void;
}) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-stone-800">
          <input
            checked={value.enabled}
            className="size-4"
            type="checkbox"
            onChange={(event) =>
              onChange(
                updateToggleText(value, { enabled: event.target.checked }),
              )
            }
          />
          Enabled
        </label>
        <Textarea
          value={value.value}
          onChange={(event) =>
            onChange(updateToggleText(value, { value: event.target.value }))
          }
        />
      </div>
    </Field>
  );
}

function updateToggleText(
  value: ToggleText,
  patch: Partial<ToggleText>,
): ToggleText {
  return {
    ...value,
    ...patch,
  };
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <Icon className="size-4 text-stone-500" />
        <h2 className="font-semibold text-stone-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-10 items-center gap-3 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800">
      <input
        checked={checked}
        className="size-4"
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-950">{value}</dd>
    </div>
  );
}

function normalizeUnitOptions(options: string[]) {
  const seen = new Set<string>();
  const normalizedOptions = options
    .map((option) => option.trim())
    .filter((option) => {
      if (!option || seen.has(option.toLowerCase())) {
        return false;
      }

      seen.add(option.toLowerCase());
      return true;
    });

  return normalizedOptions.length > 0 ? normalizedOptions : ["Unit"];
}
