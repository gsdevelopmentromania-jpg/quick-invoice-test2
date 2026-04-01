import type { Metadata } from "next";
import Link from "next/link";
import { Badge, getInvoiceStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface StatItem {
  label: string;
  valueCents: number;
  note: string;
  highlight: boolean;
}

const STATS: StatItem[] = [
  {
    label: "Total Billed",
    valueCents: 2435000,
    note: "All time",
    highlight: false,
  },
  {
    label: "Paid",
    valueCents: 1820000,
    note: "+8% vs last month",
    highlight: false,
  },
  {
    label: "Outstanding",
    valueCents: 475000,
    note: "4 invoices",
    highlight: false,
  },
  {
    label: "Overdue",
    valueCents: 140000,
    note: "2 invoices — action needed",
    highlight: true,
  },
];

interface RecentInvoice {
  id: string;
  number: string;
  clientName: string;
  status: string;
  totalCents: number;
  dueDate: string;
}

const RECENT_INVOICES: RecentInvoice[] = [
  {
    id: "inv_5",
    number: "INV-005",
    clientName: "Future Tech Inc",
    status: "VIEWED",
    totalCents: 47500,
    dueDate: "2026-04-15",
  },
  {
    id: "inv_4",
    number: "INV-004",
    clientName: "Echo Media",
    status: "DRAFT",
    totalCents: 15500,
    dueDate: "2026-04-20",
  },
  {
    id: "inv_3",
    number: "INV-003",
    clientName: "Delta Systems",
    status: "OVERDUE",
    totalCents: 14000,
    dueDate: "2026-03-28",
  },
  {
    id: "inv_2",
    number: "INV-002",
    clientName: "Bright Ideas Ltd",
    status: "SENT",
    totalCents: 32000,
    dueDate: "2026-04-10",
  },
  {
    id: "inv_1",
    number: "INV-001",
    clientName: "Acme Corp",
    status: "PAID",
    totalCents: 85000,
    dueDate: "2026-03-15",
  },
];

interface OnboardingStep {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

const ONBOARDING: OnboardingStep[] = [
  {
    id: "profile",
    label: "Complete your business profile",
    href: "/settings",
    done: false,
  },
  {
    id: "client",
    label: "Add your first client",
    href: "/clients/new",
    done: false,
  },
  {
    id: "invoice",
    label: "Create your first invoice",
    href: "/invoices/new",
    done: false,
  },
  {
    id: "send",
    label: "Send an invoice",
    href: "/invoices",
    done: false,
  },
];

function capitalise(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function DashboardPage(): React.ReactElement {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back — your invoicing overview for April 2026.
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 shadow-sm ${
              stat.highlight
                ? "border-red-200 bg-red-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {stat.label}
            </p>
            <p
              className={`mt-1.5 text-2xl font-bold ${
                stat.highlight ? "text-red-700" : "text-gray-900"
              }`}
            >
              {formatCurrency(stat.valueCents)}
            </p>
            <p
              className={`mt-1 text-xs ${
                stat.highlight ? "text-red-500" : "text-gray-400"
              }`}
            >
              {stat.note}
            </p>
          </div>
        ))}
      </div>

      {/* 2-col layout on lg */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent invoices — 2 cols wide */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Recent Invoices
                </h2>
                <Link
                  href="/invoices"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Invoice
                    </th>
                    <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:table-cell">
                      Client
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {RECENT_INVOICES.map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {inv.number}
                        </Link>
                        <p className="text-xs text-gray-400 sm:hidden">
                          {inv.clientName}
                        </p>
                        <p className="text-xs text-gray-400">
                          Due {formatDate(inv.dueDate)}
                        </p>
                      </td>
                      <td className="hidden px-5 py-3 text-gray-600 sm:table-cell">
                        {inv.clientName}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={getInvoiceStatusVariant(inv.status)}>
                          {capitalise(inv.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(inv.totalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Getting started checklist */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">
                Getting Started
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                4 steps to get the most out of Quick Invoice.
              </p>
            </CardHeader>
            <CardBody className="py-3">
              <ul className="space-y-1">
                {ONBOARDING.map((step) => (
                  <li key={step.id}>
                    <Link
                      href={step.href}
                      className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          step.done
                            ? "border-green-500 bg-green-500"
                            : "border-gray-300 group-hover:border-indigo-400"
                        }`}
                      >
                        {step.done && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`text-sm ${
                          step.done
                            ? "text-gray-400 line-through"
                            : "text-gray-700 group-hover:text-indigo-600"
                        }`}
                      >
                        {step.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">
                Quick Actions
              </h2>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-2 py-3">
              <Link href="/invoices/new" className="block">
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs font-medium text-gray-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  New Invoice
                </div>
              </Link>
              <Link href="/clients/new" className="block">
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs font-medium text-gray-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Add Client
                </div>
              </Link>
              <Link href="/invoices?status=OVERDUE" className="block">
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs font-medium text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Overdue (2)
                </div>
              </Link>
              <Link href="/settings" className="block">
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </div>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
