import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "gray";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  gray: "bg-gray-100 text-gray-500",
};

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Maps InvoiceStatus enum values to badge variants. */
export function getInvoiceStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    DRAFT: "gray",
    SENT: "info",
    VIEWED: "purple",
    PAID: "success",
    OVERDUE: "danger",
    CANCELLED: "warning",
  };
  return map[status] ?? "default";
}
