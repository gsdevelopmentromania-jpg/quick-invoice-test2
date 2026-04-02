"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Badge, getInvoiceStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  quantity: number | string;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  address?: string | null;
  phone?: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  footer?: string | null;
  subtotal: number;
  taxRate?: number | string | null;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAt?: string | null;
  sentAt?: string | null;
  client: Client;
  lineItems: LineItem[];
  payments?: Payment[];
  activities?: Activity[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalise(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function activityLabel(type: string): string {
  const map: Record<string, string> = {
    CREATED: "Invoice created",
    SENT: "Invoice sent to client",
    VIEWED: "Invoice viewed by client",
    PAID: "Invoice marked as paid",
    REMINDER_SENT: "Payment reminder sent",
    CANCELLED: "Invoice cancelled",
    DUPLICATED: "Invoice duplicated",
    STATUS_CHANGED: "Status updated",
  };
  return map[type] ?? capitalise(type.replace(/_/g, " "));
}

function activityIcon(type: string): React.ReactElement {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "CREATED":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case "SENT":
    case "REMINDER_SENT":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "VIEWED":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case "PAID":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function InvoiceDetailSkeleton(): React.ReactElement {
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto" aria-label="Loading invoice…">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 space-y-6">
        {/* Invoice header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <SkeletonText className="w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Dates + Bill To */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <SkeletonText className="w-32" />
            </div>
          ))}
        </div>

        {/* Line items */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="space-y-2 w-56">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoiceDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ── Fetch invoice ──
  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (res.status === 404) {
        setError("Invoice not found.");
        return;
      }
      if (res.status === 401) {
        setError("You are not authorised to view this invoice.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load invoice. Please try again.");
        return;
      }
      const json = await res.json() as { data?: Invoice; error?: string };
      if (json.error) {
        setError(json.error);
        return;
      }
      if (json.data) {
        setInvoice(json.data);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  // ── Show toast helper ──
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Action: Send Invoice ──
  const handleSend = async () => {
    setActionLoading("send");
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      if (res.ok) {
        showToast("success", "Invoice sent successfully.");
        await fetchInvoice();
      } else {
        const json = await res.json() as { error?: string };
        showToast("error", json.error ?? "Failed to send invoice.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Action: Send Reminder ──
  const handleReminder = async () => {
    setActionLoading("reminder");
    try {
      const res = await fetch(`/api/invoices/${id}/reminder`, { method: "POST" });
      if (res.ok) {
        showToast("success", "Reminder sent successfully.");
        await fetchInvoice();
      } else {
        const json = await res.json() as { error?: string };
        showToast("error", json.error ?? "Failed to send reminder.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Action: Mark as Paid ──
  const handleMarkPaid = async () => {
    setActionLoading("markpaid");
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (res.ok) {
        showToast("success", "Invoice marked as paid.");
        await fetchInvoice();
      } else {
        const json = await res.json() as { error?: string };
        showToast("error", json.error ?? "Failed to update status.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Action: Delete ──
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("success", "Invoice deleted.");
        router.push("/invoices");
      } else {
        const json = await res.json() as { error?: string };
        showToast("error", json.error ?? "Failed to delete invoice.");
        setActionLoading(null);
      }
    } catch {
      showToast("error", "Network error.");
      setActionLoading(null);
    }
  };

  // ── Action: Duplicate ──
  const handleDuplicate = async () => {
    setActionLoading("duplicate");
    try {
      const res = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const json = await res.json() as { data?: { id: string }; error?: string };
        showToast("success", "Invoice duplicated.");
        if (json.data?.id) {
          router.push(`/invoices/${json.data.id}`);
        }
      } else {
        const json = await res.json() as { error?: string };
        showToast("error", json.error ?? "Failed to duplicate invoice.");
        setActionLoading(null);
      }
    } catch {
      showToast("error", "Network error.");
      setActionLoading(null);
    }
  };

  // ── Render: Loading ──
  if (loading) return <InvoiceDetailSkeleton />;

  // ── Render: Error ──
  if (error || !invoice) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/invoices"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back to invoices"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice</h1>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <svg className="mx-auto h-10 w-10 text-red-400 dark:text-red-500 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error ?? "Invoice not found."}</p>
          <Link href="/invoices">
            <Button variant="outline" size="sm" className="mt-4">
              Back to Invoices
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Computed values ──
  const status = invoice.status;
  const currency = invoice.currency ?? "USD";
  const subtotal = invoice.subtotal ?? 0;
  const taxAmount = invoice.taxAmount ?? 0;
  const discountAmount = invoice.discountAmount ?? 0;
  const total = invoice.total ?? 0;
  const amountDue = status === "PAID" ? 0 : total;
  const taxRateDisplay = invoice.taxRate != null ? Number(invoice.taxRate) : 0;

  const sortedLineItems = [...invoice.lineItems].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const activities = invoice.activities ?? [];
  const payments = invoice.payments ?? [];

  // ── Render: Full page ──
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">

      {/* ── Toast notification ── */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back to invoices"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Invoice details
            </p>
          </div>
        </div>

        {/* Action buttons by status */}
        <div className="flex flex-wrap items-center gap-2">
          {status === "DRAFT" && (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading === "send"}
                onClick={() => void handleSend()}
                disabled={actionLoading !== null}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Invoice
              </Button>
              <Link href={`/invoices/${id}/edit`}>
                <Button variant="outline" size="sm" disabled={actionLoading !== null}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                loading={actionLoading === "delete"}
                onClick={() => void handleDelete()}
                disabled={actionLoading !== null}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            </>
          )}

          {(status === "SENT" || status === "VIEWED" || status === "OVERDUE") && (
            <>
              <Button
                variant="outline"
                size="sm"
                loading={actionLoading === "reminder"}
                onClick={() => void handleReminder()}
                disabled={actionLoading !== null}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Send Reminder
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading === "markpaid"}
                onClick={() => void handleMarkPaid()}
                disabled={actionLoading !== null}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark as Paid
              </Button>
              <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" disabled={actionLoading !== null}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </Button>
              </a>
            </>
          )}

          {status === "PAID" && (
            <>
              <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" disabled={actionLoading !== null}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </Button>
              </a>
              <Button
                variant="secondary"
                size="sm"
                loading={actionLoading === "duplicate"}
                onClick={() => void handleDuplicate()}
                disabled={actionLoading !== null}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Main invoice card ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        {/* Invoice header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {invoice.invoiceNumber}
                </h2>
                <Badge variant={getInvoiceStatusVariant(status)}>
                  {capitalise(status)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Issued:</span>{" "}
                  {formatDate(invoice.issueDate)}
                </span>
                <span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Due:</span>{" "}
                  {formatDate(invoice.dueDate)}
                </span>
                {invoice.paidAt && (
                  <span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Paid:</span>{" "}
                    {formatDate(invoice.paidAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                Total
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(total, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
            Bill To
          </h3>
          <div className="space-y-0.5">
            <p className="font-semibold text-gray-900 dark:text-white">{invoice.client.name}</p>
            {invoice.client.company && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.client.company}</p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.client.email}</p>
            {invoice.client.phone && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.client.phone}</p>
            )}
            {invoice.client.address && (
              <p className="text-sm text-gray-500 dark:text-gray-500 whitespace-pre-line pt-1">
                {invoice.client.address}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-6">
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
            Line Items
          </h3>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-2 pb-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                  <th className="px-2 pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 w-20">
                    Qty
                  </th>
                  <th className="px-2 pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 w-28">
                    Unit Price
                  </th>
                  <th className="px-2 pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 w-28">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {sortedLineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-2 py-3 text-gray-800 dark:text-gray-200">
                      {item.description}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-600 dark:text-gray-400">
                      {Number(item.quantity)}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(item.unitPrice, currency)}
                    </td>
                    <td className="px-2 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.amount, currency)}
                    </td>
                  </tr>
                ))}
                {sortedLineItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals summary */}
          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Discount</span>
                  <span className="text-green-600 dark:text-green-400">
                    -{formatCurrency(discountAmount, currency)}
                  </span>
                </div>
              )}
              {taxRateDisplay > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Tax ({taxRateDisplay}%)</span>
                  <span>{formatCurrency(taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
              {status !== "PAID" && (
                <div className="flex justify-between text-base font-bold text-indigo-600 dark:text-indigo-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>Amount Due</span>
                  <span>{formatCurrency(amountDue, currency)}</span>
                </div>
              )}
              {status === "PAID" && (
                <div className="flex justify-between text-base font-bold text-green-600 dark:text-green-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>Amount Due</span>
                  <span>{formatCurrency(0, currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          {invoice.footer && (
            <div className="mt-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Footer
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500 whitespace-pre-line">
                {invoice.footer}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment History ── */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Payment History
            </h3>
          </div>
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  {payment.paidAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Paid on {formatDate(payment.paidAt)}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    payment.status === "SUCCEEDED"
                      ? "success"
                      : payment.status === "FAILED"
                      ? "danger"
                      : payment.status === "REFUNDED"
                      ? "warning"
                      : "default"
                  }
                >
                  {capitalise(payment.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Activity Log ── */}
      {activities.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Activity Log
            </h3>
          </div>
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {[...activities]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              .map((activity) => (
                <li key={activity.id} className="flex items-start gap-3 px-6 py-4">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    {activityIcon(activity.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {activityLabel(activity.type)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
