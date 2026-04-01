import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Clients",
};

export default function ClientsPage(): React.ReactElement {
  return (
    <div className="p-6">
      {/* Page heading */}
      <div className="mb-6 flex items-center justify-between">
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Client
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          title="No clients yet"
          description="Add your first client to start creating invoices."
          action={
            <Link href="/clients/new">
              <Button variant="primary" size="sm">
                Add client
              </Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
