import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Base skeleton block with shimmer animation. */
export function Skeleton({ className }: SkeletonProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-md", className)}
    />
  );
}

/** Skeleton for a single-line text string. */
export function SkeletonText({ className }: SkeletonProps): React.ReactElement {
  return <Skeleton className={cn("h-4 w-3/4", className)} />;
}

/** Skeleton for a table row with configurable columns. */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }): React.ReactElement {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for an invoice/client card. */
export function SkeletonCard({ className }: SkeletonProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl border border-gray-200 bg-white p-5 space-y-3", className)}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="pt-1 flex items-center justify-between">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

/** Skeleton for a stats summary card. */
export function SkeletonStatCard({ className }: SkeletonProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl border border-gray-200 bg-white p-5 space-y-2", className)}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Full-page skeleton for the dashboard layout. */
export function SkeletonDashboard(): React.ReactElement {
  return (
    <div aria-label="Loading dashboard..." className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
