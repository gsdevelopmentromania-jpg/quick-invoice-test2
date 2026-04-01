import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: InputProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900",
          "placeholder-gray-400 shadow-sm transition-colors",
          "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
          "dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500",
          "dark:disabled:bg-gray-900 dark:disabled:text-gray-600",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-600",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}
