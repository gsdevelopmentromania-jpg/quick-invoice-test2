import type { Metadata } from "next";
import Link from "next/link";
import { SkeletonText, Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "New Invoice",
};

export default function NewInvoicePage(): React.ReactElement {
  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link
          href="/invoices"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          aria-label="Back to invoices"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
      </div>

      {/* Form placeholder — implementation in feature task */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4" aria-label="Invoice form (coming soon)">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Bill to</p>
        <Skeleton className="h-9 w-full" />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <SkeletonText className="w-20 h-3" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-1">
            <SkeletonText className="w-20 h-3" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">Line Items</p>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-end gap-3">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
