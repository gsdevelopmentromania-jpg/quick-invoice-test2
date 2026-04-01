import type { Metadata } from "next";
import Link from "next/link";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Invoice",
};

interface InvoiceDetailPageProps {
  params: { id: string };
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps): React.ReactElement {
  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
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
          <h1 className="text-2xl font-bold text-gray-900">Invoice #{params.id.slice(0, 8)}</h1>
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Invoice preview placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6" aria-label="Invoice details (loading)">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <SkeletonText className="w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <SkeletonText className="w-40" />
            <SkeletonText className="w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <SkeletonText className="w-24" />
            <SkeletonText className="w-28" />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="border-t border-gray-100 pt-4 flex justify-end">
          <div className="space-y-2 w-48">
            <div className="flex justify-between">
              <SkeletonText className="w-16 h-3" />
              <SkeletonText className="w-16 h-3" />
            </div>
            <div className="flex justify-between">
              <SkeletonText className="w-16 h-3" />
              <SkeletonText className="w-16 h-3" />
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-100">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
