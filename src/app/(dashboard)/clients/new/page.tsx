import type { Metadata } from "next";
import Link from "next/link";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "New Client",
};

export default function NewClientPage(): React.ReactElement {
  return (
    <div className="p-6 space-y-5 max-w-xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link
          href="/clients"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          aria-label="Back to clients"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
      </div>

      {/* Form placeholder — implementation in feature task */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4" aria-label="Client form (coming soon)">
        {[
          "Full name",
          "Email address",
          "Company (optional)",
          "Phone (optional)",
          "Address (optional)",
        ].map((label) => (
          <div key={label} className="space-y-1">
            <SkeletonText className="w-28 h-3" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}

        <div className="pt-2 flex justify-end gap-3">
          <Link
            href="/clients"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
