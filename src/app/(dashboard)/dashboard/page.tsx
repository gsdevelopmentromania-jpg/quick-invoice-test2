import type { Metadata } from "next";
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage(): React.ReactElement {
  return (
    <div className="p-6">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back — here&apos;s a summary of your invoicing activity.
        </p>
      </div>

      {/* Placeholder: feature content will be added in the next task */}
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          }
          title="Dashboard coming soon"
          description="Stats, recent invoices, and quick actions will appear here."
        />
      </div>

      {/* Skeleton preview (hidden — used during loading states) */}
      <div className="sr-only" aria-hidden="true">
        <SkeletonDashboard />
      </div>
    </div>
  );
}
