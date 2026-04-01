import type { Metadata } from "next";
import Link from "next/link";
import { SkeletonStatCard, SkeletonCard } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage(): React.ReactElement {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Welcome back! Here&apos;s an overview.</p>
        </div>
        <Link
          href="/invoices/new"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Stats row — placeholder skeletons until feature implementation */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Overview statistics">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Recent invoices placeholder */}
      <section aria-labelledby="recent-invoices-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-invoices-heading" className="text-base font-semibold text-gray-900">
            Recent Invoices
          </h2>
          <Link href="/invoices" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </div>
  );
}
