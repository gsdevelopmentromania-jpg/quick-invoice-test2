"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, InvoiceWithClient } from "@/types";
import type { Client } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Convert a Date or ISO string from the API into a YYYY-MM-DD input value */
function toDateInputValue(value: string | Date): string {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert a YYYY-MM-DD date input value to a full ISO datetime string */
function toISODatetime(dateStr: string): string {
  return new Date(dateStr).toISOString();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditInvoicePage(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceWithClient | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [footer, setFooter] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: makeId(), description: "", quantity: "1", unitPrice: "" },
  ]);

  // ── Load invoice + clients ──────────────────────────────────────────────────
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [invoiceRes, clientsRes] = await Promise.all([
          fetch(`/api/invoices/${invoiceId}`),
          fetch("/api/clients?pageSize=100"),
        ]);

        if (!invoiceRes.ok) {
          const data = (await invoiceRes.json()) as { error?: string };
          setFetchError(data.error ?? "Invoice not found.");
          setPageLoading(false);
          return;
        }

        const invoiceJson = (await invoiceRes.json()) as ApiResponse<InvoiceWithClient>;
        const clientsJson = (await clientsRes.json()) as ApiResponse<{
          data: Client[];
          total: number;
          page: number;
          limit: number;
        }>;

        if (invoiceJson.data) {
          const inv = invoiceJson.data;
          setInvoice(inv);
          setClientId(inv.clientId);
          setIssueDate(toDateInputValue(inv.issueDate));
          setDueDate(toDateInputValue(inv.dueDate));
          setCurrency(inv.currency ?? "USD");
          // taxRate is a Prisma Decimal — serialises as a string in JSON
          setTaxRate(String(parseFloat(String(inv.taxRate ?? "0"))));
          // discountAmount is stored in cents
          setDiscountAmount(String(Number(inv.discountAmount ?? 0) / 100));
          setNotes(inv.notes ?? "");
          setFooter(inv.footer ?? "");
          if (inv.lineItems.length > 0) {
            setLineItems(
              inv.lineItems
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => ({
                  id: makeId(),
                  description: item.description,
                  // quantity is a Prisma Decimal — serialises as string
                  quantity: String(parseFloat(String(item.quantity))),
                  // unitPrice stored in cents
                  unitPrice: String(Number(item.unitPrice) / 100),
                }))
            );
          }
        }

        if (clientsJson.data?.data) {
          setClients(clientsJson.data.data);
        }
      } catch {
        setFetchError("Failed to load invoice. Please try again.");
      } finally {
        setPageLoading(false);
      }
    }

    void load();
  }, [invoiceId]);

  // ── Line item handlers ──────────────────────────────────────────────────────
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { id: makeId(), description: "", quantity: "1", unitPrice: "" },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof Omit<LineItem, "id">, value: string) => {
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  // ── Computed totals ─────────────────────────────────────────────────────────
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const taxAmountCalc = (subtotal * (parseFloat(taxRate) || 0)) / 100;
  const discount = parseFloat(discountAmount) || 0;
  const total = subtotal + taxAmountCalc - discount;

  // ── Save handler ────────────────────────────────────────────────────────────
  async function handleSave(): Promise<void> {
    setFormError(null);

    if (!clientId) {
      setFormError("Please select a client.");
      return;
    }
    if (!dueDate) {
      setFormError("Please set a due date.");
      return;
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
    );
    if (validItems.length === 0) {
      setFormError("Add at least one line item with a description and price.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        clientId,
        dueDate: toISODatetime(dueDate),
        currency,
        taxRate: parseFloat(taxRate) || 0,
        discountAmount: discount,
        notes: notes.trim() || undefined,
        footer: footer.trim() || undefined,
        lineItems: validItems.map((item, i) => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          sortOrder: i,
        })),
      };

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save invoice.");
      }

      router.push(`/invoices/${invoiceId}`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.company ? `${c.name} (${c.company})` : `${c.name} — ${c.email}`,
  }));

  const isDraft = invoice?.status === "DRAFT";
  const isReadOnly = invoice !== null && !isDraft;
  const statusLabel = invoice ? (STATUS_LABELS[invoice.status] ?? invoice.status) : "";

  // ── Render: loading ─────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-48 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  // ── Render: not found ───────────────────────────────────────────────────────
  if (!invoice) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            {fetchError ?? "Invoice not found."}
          </div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to invoices
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: main form ───────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back link + heading */}
        <div>
          <Link
            href={`/invoices/${invoiceId}`}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to invoice
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Edit Invoice {invoice.invoiceNumber}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isDraft
              ? "Update the details below and save your changes."
              : "This invoice is read-only and cannot be edited."}
          </p>
        </div>

        {/* Read-only banner for non-DRAFT invoices */}
        {isReadOnly && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <span>
              <strong>Read-only invoice:</strong> This invoice has status{" "}
              <strong>{statusLabel}</strong>. Only invoices in{" "}
              <strong>Draft</strong> status can be edited.{" "}
              <Link
                href={`/invoices/${invoiceId}`}
                className="underline hover:no-underline"
              >
                View invoice →
              </Link>
            </span>
          </div>
        )}

        {/* Form error */}
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            {formError}
          </div>
        )}

        {/* ── Invoice meta ── */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Invoice Details
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="clientId"
                label="Client *"
                options={clientOptions}
                placeholder="Select a client…"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isReadOnly}
              />
              <Input
                id="invoiceNumber"
                label="Invoice Number"
                value={invoice.invoiceNumber}
                readOnly
                className="bg-gray-50 dark:bg-gray-900"
                hint="Auto-generated — cannot be changed"
              />
              <Input
                id="issueDate"
                label="Issue Date"
                type="date"
                value={issueDate}
                readOnly
                className="bg-gray-50 dark:bg-gray-900"
              />
              <Input
                id="dueDate"
                label="Due Date *"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                readOnly={isReadOnly}
              />
              <Select
                id="currency"
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </CardBody>
        </Card>

        {/* ── Line items ── */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Line Items
            </h2>
          </CardHeader>
          <CardBody className="space-y-3 p-0">
            {/* Column headers (desktop) */}
            <div className="hidden grid-cols-12 gap-3 border-b border-gray-100 px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:grid">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-3 text-right">Unit Price</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="px-5 py-3">
                  <div className="grid grid-cols-12 items-start gap-3">
                    {/* Description */}
                    <div className="col-span-12 sm:col-span-6">
                      <Input
                        id={`desc-${item.id}`}
                        placeholder={`Item ${idx + 1} description`}
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, "description", e.target.value)
                        }
                        aria-label="Description"
                        readOnly={isReadOnly}
                      />
                    </div>
                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        id={`qty-${item.id}`}
                        type="number"
                        placeholder="1"
                        min="0"
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, "quantity", e.target.value)
                        }
                        aria-label="Quantity"
                        readOnly={isReadOnly}
                      />
                    </div>
                    {/* Unit price */}
                    <div className="col-span-7 sm:col-span-3">
                      <Input
                        id={`price-${item.id}`}
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.id, "unitPrice", e.target.value)
                        }
                        aria-label="Unit price"
                        readOnly={isReadOnly}
                      />
                    </div>
                    {/* Remove */}
                    <div className="col-span-1 flex justify-end pt-1.5">
                      {!isReadOnly && lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"
                          aria-label="Remove line item"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Row total (mobile only) */}
                  {item.description && item.unitPrice && (
                    <p className="mt-1 text-right text-xs text-gray-400 sm:hidden">
                      {formatCurrency(
                        (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.unitPrice) || 0) *
                          100,
                        currency
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Add line item */}
            {!isReadOnly && (
              <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-700">
                <button
                  type="button"
                  onClick={addLineItem}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add line item
                </button>
              </div>
            )}
          </CardBody>

          {/* Totals */}
          <CardFooter>
            <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal * 100, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-gray-600 dark:text-gray-400">
                <span>Tax</span>
                <div className="flex items-center gap-2">
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-16 py-1 text-right"
                    aria-label="Tax rate percentage"
                    readOnly={isReadOnly}
                  />
                  <span className="text-gray-400">%</span>
                  <span className="w-20 text-right">
                    {formatCurrency(taxAmountCalc * 100, currency)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 text-gray-600 dark:text-gray-400">
                <span>Discount</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-20 py-1 text-right"
                    aria-label="Discount amount"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                <span>Total</span>
                <span>{formatCurrency(total * 100, currency)}</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* ── Notes & Footer ── */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Notes &amp; Footer
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Textarea
              id="notes"
              label="Notes (visible to client)"
              placeholder="Any additional notes for this invoice…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              readOnly={isReadOnly}
            />
            <Textarea
              id="footer"
              label="Footer text"
              rows={2}
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              readOnly={isReadOnly}
            />
          </CardBody>
        </Card>

        {/* ── Action row ── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              {isDraft ? "Cancel" : "Back to Invoice"}
            </Button>
          </Link>
          {isDraft && (
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
