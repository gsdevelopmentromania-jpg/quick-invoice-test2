"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/invoices": "Invoices",
  "/invoices/new": "New Invoice",
  "/clients": "Clients",
  "/clients/new": "New Client",
  "/settings": "Settings",
};

interface HeaderProps {
  onMenuOpen: () => void;
}

export function Header({ onMenuOpen }: HeaderProps): React.ReactElement {
  const pathname = usePathname();

  const title = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));

  const pageTitle = (title && PAGE_TITLES[title]) ?? "Quick Invoice";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
      {/* Hamburger */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Open navigation menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title */}
      <span className="text-base font-semibold text-gray-900">{pageTitle}</span>

      {/* Quick action */}
      <Link
        href="/invoices/new"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Create new invoice"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </header>
  );
}
