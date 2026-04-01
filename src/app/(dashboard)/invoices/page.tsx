import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Invoices",
};

export default function InvoicesPage(): React.ReactElement {
  return (
    <div className="p-6">
      {/* Page heading */}
      <div className="mb-6 flex items-center justify-between">
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Empty state placeholder */}
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
          title="No invoices yet"
          description="Create your first invoice and start getting paid faster."
          action={
            <Link href="/invoices/new">
              <Button variant="primary" size="sm">
                Create invoice
              </Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
