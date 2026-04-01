"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
            aria-hidden="true"
            onClick={closeSidebar}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-[240px] lg:hidden">
            <Sidebar onClose={closeSidebar} />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <Header onMenuOpen={openSidebar} />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto focus:outline-none"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
