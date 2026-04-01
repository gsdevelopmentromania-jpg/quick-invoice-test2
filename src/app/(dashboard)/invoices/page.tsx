"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge, getInvoiceStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MockInvoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  status: string;
  totalCents: number;
  issuedAt: string;
  dueDate: string;
}

const MOCK_INVOICES: MockInvoice[] = [
  {
    id: "inv_5",
    number: "INV-005",
    clientName: "Future Tech Inc",
    clientEmail: "ap@futuretech.com",
    status: "VIEWED",
    totalCents: 47500,
    issuedAt: "2026-04-01",
    dueDate: "2026-04-15",
  },
  {
    id: "inv_4",
    number: "INV-004",
    clientName: "Echo Media",
    clientEmail: "billing@echomedia.co",
    status: "DRAFT",
    totalCents: 15500,
    issuedAt: "2026-04-01",
    dueDate: "2026-04-20",
  },
  {
    id: "inv_3",
    number: "INV-003",
    clientName: "Delta Systems",
    clientEmail: "finance@deltasystems.io",
    status: "OVERDUE",
    totalCents: 14000,
    issuedAt: "2026-03-14",
    dueDate: "2026-03-28",
  },
  {
    id: "inv_2",
    number: "INV-002",
    clientName: "Bright Ideas Ltd",
    clientEmail: "accounts@brightideas.com",
    status: "SENT",
    totalCents: 32000,
    issuedAt: "2026-03-27",
    dueDate: "2026-04-10",
  },
  {
    id: "inv_1",
    number: "INV-001",
    clientName: "Acme Corp",
    clientEmail: "billing@acme.com",
    status: "PAID",
    totalCents: 85000,
    issuedAt: "2026-03-01",
    dueDate: "2026-03-15",
  },
];

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Viewed", value: "VIEWED" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

function capitalise(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function InvoicesPage(): React.ReactElement {
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_INVOICES.filter((inv) => {
      const matchesStatus =
        activeStatus === "ALL" || inv.status === activeStatus;
      const matchesSearch =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.clientEmail.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [activeStatus, search]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create, send, and track all your invoices.
          </p>
        </div>
        <Link href="/invoices/new">
          <Button variant="primary" size="md">
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
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0 sm:w-64">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white">
          <EmptyState
            icon={
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            title={search ? "No results found" : "No invoices yet"}
            description={
              search
                ? `No invoices match "${search}".`
                : "Create your first invoice and start getting paid faster."
            }
            action={
              !search ? (
                <Link href="/invoices/new">
                  <Button variant="primary" size="sm">
                    Create invoice
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Invoice
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:table-cell">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 md:table-cell">
                    Due Date
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {inv.number}
                      </Link>
                      <p className="text-xs text-gray-400 sm:hidden">
                        {inv.clientName}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3.5 sm:table-cell">
                      <p className="font-medium text-gray-700">
                        {inv.clientName}
                      </p>
                      <p className="text-xs text-gray-400">{inv.clientEmail}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getInvoiceStatusVariant(inv.status)}>
                        {capitalise(inv.status)}
                      </Badge>
                    </td>
                    <td className="hidden px-5 py-3.5 text-gray-600 md:table-cell">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                      {formatCurrency(inv.totalCents)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
            Showing {filtered.length} of {MOCK_INVOICES.length} invoices
          </div>
        </div>
      )}
    </div>
  );
}
