"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface MockClient {
  id: string;
  name: string;
  email: string;
}

const MOCK_CLIENTS: MockClient[] = [
  { id: "client_1", name: "Acme Corp", email: "billing@acme.com" },
  {
    id: "client_2",
    name: "Bright Ideas Ltd",
    email: "accounts@brightideas.com",
  },
  { id: "client_3", name: "Delta Systems", email: "finance@deltasystems.io" },
  { id: "client_4", name: "Echo Media", email: "billing@echomedia.co" },
  { id: "client_5", name: "Future Tech Inc", email: "ap@futuretech.com" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const CLIENT_OPTIONS = MOCK_CLIENTS.map((c) => ({
  value: c.id,
  label: `${c.name} — ${c.email}`,
}));

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function thirtyDaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextInvoiceNumber(): string {
  return "INV-006";
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function NewInvoicePage(): React.ReactElement {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [invoiceNumber] = useState(nextInvoiceNumber);
  const [issueDate] = useState(todayISO);
  const [dueDate, setDueDate] = useState(thirtyDaysISO);
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [footer, setFooter] = useState("Thank you for your business!");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: makeId(), description: "", quantity: "1", unitPrice: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  // Totals
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100;
  const discount = parseFloat(discountAmount) || 0;
  const total = subtotal + taxAmount - discount;

  async function handleSubmit(): Promise<void> {
    setError(null);

    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    if (!dueDate) {
      setError("Please set a due date.");
      return;
    }
    const validItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
    );
    if (validItems.length === 0) {
      setError("Add at least one line item with a description and price.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        clientId,
        dueDate,
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

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to create invoice.");
      }

      router.push("/invoices");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back link + heading */}
        <div>
          <Link
            href="/invoices"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to invoices
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">New Invoice</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the details below, then save as draft or send immediately.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Invoice meta */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">
              Invoice Details
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="clientId"
                label="Client *"
                options={CLIENT_OPTIONS}
                placeholder="Select a client…"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
              <Input
                id="invoiceNumber"
                label="Invoice Number"
                value={invoiceNumber}
                readOnly
                className="bg-gray-50"
                hint="Auto-generated"
              />
              <Input
                id="issueDate"
                label="Issue Date"
                type="date"
                value={issueDate}
                readOnly
                className="bg-gray-50"
              />
              <Input
                id="dueDate"
                label="Due Date *"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <Select
                id="currency"
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">
              Line Items
            </h2>
          </CardHeader>
          <CardBody className="space-y-3 p-0">
            {/* Header row (hidden on mobile) */}
            <div className="hidden grid-cols-12 gap-3 border-b border-gray-100 px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-3 text-right">Unit Price</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-gray-50">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="px-5 py-3">
                  <div className="grid grid-cols-12 items-start gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <Input
                        id={`desc-${item.id}`}
                        placeholder={`Item ${idx + 1} description`}
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, "description", e.target.value)
                        }
                        aria-label="Description"
                      />
                    </div>
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
                      />
                    </div>
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
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pt-1.5">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
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
                  {/* Row total on mobile */}
                  {item.description && item.unitPrice && (
                    <p className="mt-1 text-right text-xs text-gray-400 sm:hidden">
                      {formatCurrency(
                        (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.unitPrice) || 0) *
                          100
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 px-5 py-3">
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
          </CardBody>

          {/* Totals */}
          <CardFooter>
            <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal * 100)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-gray-600">
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
                  />
                  <span className="text-gray-400">%</span>
                  <span className="w-20 text-right">
                    {formatCurrency(taxAmount * 100)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 text-gray-600">
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
                  />
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(total * 100)}</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Notes + footer */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">
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
            />
            <Textarea
              id="footer"
              label="Footer text"
              rows={2}
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
            />
          </CardBody>
        </Card>

        {/* Action row */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/invoices">
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            loading={loading}
            onClick={() => void handleSubmit()}
            disabled={loading}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={loading}
            onClick={() => void handleSubmit()}
            disabled={loading}
          >
            Send Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
