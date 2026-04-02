"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Badge, getInvoiceStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  company: string | null;
  currency: string;
  notes: string | null;
  createdAt: string;
}

interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  paidCents: number;
  dueDate: string;
  createdAt: string;
}

interface EditFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
}

// ─── Mock data (matches API shapes) ──────────────────────────────────────────

const MOCK_CLIENTS: Record<string, ClientDetail> = {
  client_1: {
    id: "client_1",
    name: "Acme Corp",
    email: "billing@acme.com",
    phone: "+1 (555) 200-1234",
    address: "742 Evergreen Terrace, Springfield, IL 62704",
    company: "Acme Corporation",
    currency: "USD",
    notes: "Net 30 payment terms. Primary contact: John Smith.",
    createdAt: "2026-01-15T10:00:00Z",
  },
  client_2: {
    id: "client_2",
    name: "Bright Ideas Ltd",
    email: "accounts@brightideas.com",
    phone: "+44 20 7946 0958",
    address: "12 Innovation Way, London, EC1A 1BB, UK",
    company: "Bright Ideas Ltd",
    currency: "GBP",
    notes: null,
    createdAt: "2026-02-03T09:00:00Z",
  },
  client_3: {
    id: "client_3",
    name: "Delta Systems",
    email: "finance@deltasystems.io",
    phone: null,
    address: "1 Tech Park Dr, Austin, TX 78701",
    company: null,
    currency: "USD",
    notes: null,
    createdAt: "2026-02-20T08:00:00Z",
  },
  client_4: {
    id: "client_4",
    name: "Echo Media",
    email: "billing@echomedia.co",
    phone: "+1 (555) 987-6543",
    address: null,
    company: "Echo Media Group",
    currency: "USD",
    notes: null,
    createdAt: "2026-03-01T11:00:00Z",
  },
  client_5: {
    id: "client_5",
    name: "Future Tech Inc",
    email: "ap@futuretech.com",
    phone: "+1 (555) 100-2200",
    address: "99 Silicon Ave, San Jose, CA 95101",
    company: "Future Technology Inc",
    currency: "USD",
    notes: "Prefers PDF invoices sent by email.",
    createdAt: "2026-03-10T14:00:00Z",
  },
};

const MOCK_INVOICES: Record<string, ClientInvoice[]> = {
  client_1: [
    {
      id: "inv_1a",
      invoiceNumber: "INV-0001",
      status: "PAID",
      totalCents: 45000,
      paidCents: 45000,
      dueDate: "2026-02-15T00:00:00Z",
      createdAt: "2026-01-20T00:00:00Z",
    },
    {
      id: "inv_1b",
      invoiceNumber: "INV-0005",
      status: "PAID",
      totalCents: 62000,
      paidCents: 62000,
      dueDate: "2026-03-01T00:00:00Z",
      createdAt: "2026-02-10T00:00:00Z",
    },
    {
      id: "inv_1c",
      invoiceNumber: "INV-0012",
      status: "OVERDUE",
      totalCents: 38000,
      paidCents: 0,
      dueDate: "2026-03-20T00:00:00Z",
      createdAt: "2026-03-10T00:00:00Z",
    },
  ],
  client_2: [
    {
      id: "inv_2a",
      invoiceNumber: "INV-0008",
      status: "SENT",
      totalCents: 32000,
      paidCents: 0,
      dueDate: "2026-05-10T00:00:00Z",
      createdAt: "2026-04-10T00:00:00Z",
    },
  ],
  client_3: [
    {
      id: "inv_3a",
      invoiceNumber: "INV-0003",
      status: "PAID",
      totalCents: 27000,
      paidCents: 27000,
      dueDate: "2026-03-01T00:00:00Z",
      createdAt: "2026-02-15T00:00:00Z",
    },
    {
      id: "inv_3b",
      invoiceNumber: "INV-0010",
      status: "DRAFT",
      totalCents: 27000,
      paidCents: 0,
      dueDate: "2026-05-01T00:00:00Z",
      createdAt: "2026-03-28T00:00:00Z",
    },
  ],
  client_4: [
    {
      id: "inv_4a",
      invoiceNumber: "INV-0006",
      status: "SENT",
      totalCents: 15500,
      paidCents: 0,
      dueDate: "2026-05-20T00:00:00Z",
      createdAt: "2026-04-20T00:00:00Z",
    },
  ],
  client_5: [
    {
      id: "inv_5a",
      invoiceNumber: "INV-0009",
      status: "PAID",
      totalCents: 47500,
      paidCents: 47500,
      dueDate: "2026-04-30T00:00:00Z",
      createdAt: "2026-04-15T00:00:00Z",
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function computeStats(invoices: ClientInvoice[]) {
  const totalBilledCents = invoices.reduce((sum, inv) => sum + inv.totalCents, 0);
  const totalPaidCents = invoices.reduce((sum, inv) => sum + inv.paidCents, 0);
  const outstandingCents = totalBilledCents - totalPaidCents;
  return { totalBilledCents, totalPaidCents, outstandingCents };
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
  clientName: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteDialog({ clientName, deleting, onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2
          id="delete-dialog-title"
          className="mb-1 text-base font-semibold text-gray-900 dark:text-white"
        >
          Delete client?
        </h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-300">{clientName}</strong> and all
          associated data will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={deleting}>
            Delete client
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

interface EditFormProps {
  initial: EditFormState;
  saving: boolean;
  error: string | null;
  onSave: (data: EditFormState) => void;
  onCancel: () => void;
}

function EditForm({ initial, saving, error, onSave, onCancel }: EditFormProps) {
  const [form, setForm] = useState<EditFormState>(initial);

  function handleChange(field: keyof EditFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="edit-name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="edit-email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="edit-company"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Company
          </label>
          <input
            id="edit-company"
            type="text"
            value={form.company}
            onChange={(e) => handleChange("company", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            placeholder="Optional"
          />
        </div>
        <div>
          <label
            htmlFor="edit-phone"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Phone
          </label>
          <input
            id="edit-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="edit-address"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Address
        </label>
        <textarea
          id="edit-address"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          rows={2}
          className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          placeholder="Optional"
        />
      </div>

      <div>
        <label
          htmlFor="edit-notes"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Notes
        </label>
        <textarea
          id="edit-notes"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={3}
          className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          placeholder="Internal notes about this client"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientDetailPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params?.id ?? "";

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch client ────────────────────────────────────────────────────────────
  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.status === 404) {
        // Fall back to mock data for preview/demo
        const mock = MOCK_CLIENTS[clientId];
        if (mock) {
          setClient(mock);
          setInvoices(MOCK_INVOICES[clientId] ?? []);
        } else {
          setNotFound(true);
        }
        return;
      }
      if (!res.ok) throw new Error("Failed to load client");
      const json = await res.json();
      const data: ClientDetail = json.data;
      setClient(data);

      // Fetch invoices for this client
      const invRes = await fetch(`/api/invoices?clientId=${clientId}`);
      if (invRes.ok) {
        const invJson = await invRes.json();
        setInvoices(invJson.data ?? []);
      } else {
        setInvoices(MOCK_INVOICES[clientId] ?? []);
      }
    } catch {
      // Use mock data on error (preview/demo mode)
      const mock = MOCK_CLIENTS[clientId];
      if (mock) {
        setClient(mock);
        setInvoices(MOCK_INVOICES[clientId] ?? []);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) fetchClient();
  }, [clientId, fetchClient]);

  // ── Save edits ──────────────────────────────────────────────────────────────
  async function handleSave(form: EditFormState) {
    if (!client) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to save");
      }
      const json = await res.json();
      setClient(json.data);
      setEditing(false);
    } catch (err) {
      // In demo/preview mode update locally
      setClient((prev) =>
        prev
          ? {
              ...prev,
              name: form.name,
              email: form.email,
              company: form.company || null,
              phone: form.phone || null,
              address: form.address || null,
              notes: form.notes || null,
            }
          : prev
      );
      setEditing(false);
      const message = err instanceof Error ? err.message : "Unknown error";
      if (!message.includes("Failed to save")) {
        setSaveError(null); // silently succeed in demo mode
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Delete client ───────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    } catch {
      // ignore errors in demo mode
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      router.push("/clients");
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-36" />
              <SkeletonText className="w-48" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-gray-800 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  if (notFound || !client) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
          Client not found
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          This client may have been deleted or doesn't exist.
        </p>
        <Link href="/clients">
          <Button variant="outline" size="sm">
            Back to clients
          </Button>
        </Link>
      </div>
    );
  }

  const stats = computeStats(invoices);
  const initials = getInitials(client.name);

  const editInitial: EditFormState = {
    name: client.name,
    email: client.email,
    phone: client.phone ?? "",
    address: client.address ?? "",
    company: client.company ?? "",
    notes: client.notes ?? "",
  };

  return (
    <>
      {showDeleteDialog && (
        <DeleteDialog
          clientName={client.name}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}

      <div className="space-y-5 p-4 sm:p-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/clients"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Back to clients"
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
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{client.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/invoices/new?clientId=${clientId}`}>
              <Button variant="primary" size="sm">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New invoice
              </Button>
            </Link>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                  />
                </svg>
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950"
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
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              Delete
            </Button>
          </div>
        </div>

        {/* ── Client profile card ────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {editing ? (
            <>
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                Edit client
              </h2>
              <EditForm
                initial={editInitial}
                saving={saving}
                error={saveError}
                onSave={handleSave}
                onCancel={() => {
                  setEditing(false);
                  setSaveError(null);
                }}
              />
            </>
          ) : (
            <>
              {/* Avatar + name row */}
              <div className="flex items-start gap-4">
                <div
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {client.name}
                  </p>
                  {client.company && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{client.company}</p>
                  )}
                </div>
              </div>

              {/* Detail fields */}
              <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-gray-100 pt-5 dark:border-gray-800 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Email
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-white">
                    <a
                      href={`mailto:${client.email}`}
                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {client.email}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Phone
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Address
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {client.address ?? (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </dd>
                </div>

                {client.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Notes
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                      {client.notes}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Currency
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {client.currency}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Client since
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {formatDate(client.createdAt)}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </div>

        {/* ── Summary stats ─────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Total billed
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(stats.totalBilledCents, client.currency)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              across {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Total paid
            </p>
            <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(stats.totalPaidCents, client.currency)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">collected</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Outstanding
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                stats.outstandingCents > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {formatCurrency(stats.outstandingCents, client.currency)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">balance due</p>
          </div>
        </div>

        {/* ── Invoice history ────────────────────────────────────────────── */}
        <section aria-labelledby="client-invoices-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="client-invoices-heading"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Invoice history
            </h2>
            <Link href={`/invoices/new?clientId=${clientId}`}>
              <Button variant="ghost" size="sm">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create invoice
              </Button>
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No invoices yet for this client.
              </p>
              <div className="mt-3">
                <Link href={`/invoices/new?clientId=${clientId}`}>
                  <Button variant="primary" size="sm">
                    Create first invoice
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      Invoice
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      Due
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={getInvoiceStatusVariant(inv.status)}>
                          {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(inv.totalCents, client.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
                {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
