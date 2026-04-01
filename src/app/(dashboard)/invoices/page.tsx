import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Invoices",
};

export default function InvoicesPage(): React.ReactElement {
  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-0.5 text-sm text-gray-500">Create and manage your invoices.</p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Filter bar placeholder */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
        {["All", "Draft", "Sent", "Paid", "Overdue"].map((filter) => (
          <button
            key={filter}
            className="rounded-md px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors first:bg-indigo-50 first:text-indigo-700 first:font-medium"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Empty state — will be replaced with invoice table in feature task */}
      <EmptyState
        icon={
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="No invoices yet"
        description="Create your first invoice to get started. It only takes 2 minutes."
        action={
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Create invoice
          </Link>
        }
      />
    </div>
  );
}
