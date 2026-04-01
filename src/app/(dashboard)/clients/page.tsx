"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

interface MockClient {
  id: string;
  name: string;
  email: string;
  company: string | null;
  invoiceCount: number;
  totalBilledCents: number;
  lastInvoiceDate: string | null;
}

const MOCK_CLIENTS: MockClient[] = [
  {
    id: "client_1",
    name: "Acme Corp",
    email: "billing@acme.com",
    company: "Acme Corporation",
    invoiceCount: 3,
    totalBilledCents: 145000,
    lastInvoiceDate: "2026-03-15",
  },
  {
    id: "client_2",
    name: "Bright Ideas Ltd",
    email: "accounts@brightideas.com",
    company: "Bright Ideas Ltd",
    invoiceCount: 1,
    totalBilledCents: 32000,
    lastInvoiceDate: "2026-04-10",
  },
  {
    id: "client_3",
    name: "Delta Systems",
    email: "finance@deltasystems.io",
    company: null,
    invoiceCount: 2,
    totalBilledCents: 54000,
    lastInvoiceDate: "2026-03-28",
  },
  {
    id: "client_4",
    name: "Echo Media",
    email: "billing@echomedia.co",
    company: "Echo Media Group",
    invoiceCount: 1,
    totalBilledCents: 15500,
    lastInvoiceDate: "2026-04-20",
  },
  {
    id: "client_5",
    name: "Future Tech Inc",
    email: "ap@futuretech.com",
    company: "Future Technology Inc",
    invoiceCount: 1,
    totalBilledCents: 47500,
    lastInvoiceDate: "2026-04-15",
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-purple-100 text-purple-700",
];

export default function ClientsPage(): React.ReactElement {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return MOCK_CLIENTS;
    return MOCK_CLIENTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your client contacts and billing details.
          </p>
        </div>
        <Link href="/clients/new">
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
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
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
          placeholder="Search clients…"
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Client list */}
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            title={search ? "No clients found" : "No clients yet"}
            description={
              search
                ? `No clients match "${search}".`
                : "Add your first client to start creating invoices."
            }
            action={
              !search ? (
                <Link href="/clients/new">
                  <Button variant="primary" size="sm">
                    Add client
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gray-50" role="list">
            {filtered.map((client, idx) => {
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colorClass}`}
                      aria-hidden="true"
                    >
                      {getInitials(client.name)}
                    </div>

                    {/* Name + email */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {client.name}
                      </p>
                      <p className="truncate text-sm text-gray-400">
                        {client.company
                          ? `${client.company} · ${client.email}`
                          : client.email}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden flex-shrink-0 text-right sm:block">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(client.totalBilledCents)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {client.invoiceCount}{" "}
                        {client.invoiceCount === 1 ? "invoice" : "invoices"}
                      </p>
                    </div>

                    {/* Chevron */}
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
            {filtered.length} {filtered.length === 1 ? "client" : "clients"}
          </div>
        </div>
      )}
    </div>
  );
}
