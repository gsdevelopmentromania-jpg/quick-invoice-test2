import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<AlertVariant, { wrapper: string; icon: React.ReactElement }> = {
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
    icon: (
      <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  success: {
    wrapper: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
    icon: (
      <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
    icon: (
      <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  info: {
    wrapper: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    icon: (
      <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
};

/**
 * Inline alert banner for feedback messages.
 *
 * Usage:
 * ```tsx
 * <Alert variant="error">Something went wrong.</Alert>
 * <Alert variant="success">Invoice sent successfully!</Alert>
 * ```
 */
export function Alert({
  variant = "info",
  children,
  className,
}: AlertProps): React.ReactElement {
  const { wrapper, icon } = styles[variant];

  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
        wrapper,
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
