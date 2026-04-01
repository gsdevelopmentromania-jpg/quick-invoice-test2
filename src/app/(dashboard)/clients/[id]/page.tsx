import type { Metadata } from "next";
import Link from "next/link";
import { Skeleton, SkeletonText, SkeletonCard } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Client",
};

interface ClientDetailPageProps {
  params: { id: string };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps): React.ReactElement {
  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
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
          <h1 className="text-2xl font-bold text-gray-900">Client #{params.id.slice(0, 8)}</h1>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Client info placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <SkeletonText className="w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <SkeletonText className="w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <SkeletonText className="w-24" />
          </div>
        </div>
      </div>

      {/* Client invoices placeholder */}
      <section aria-labelledby="client-invoices-heading">
        <h2 id="client-invoices-heading" className="mb-3 text-base font-semibold text-gray-900">
          Invoices
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </div>
  );
}
