import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Quick Invoice",
    default: "Quick Invoice",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-900">Quick Invoice</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        © 2026 Quick Invoice. All rights reserved.
      </footer>
    </div>
  );
}
