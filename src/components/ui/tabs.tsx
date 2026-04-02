"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  /** ID of the initially active tab. Defaults to the first tab. */
  defaultTab?: string;
  className?: string;
}

/**
 * Accessible tab panel.
 *
 * Usage:
 * ```tsx
 * <Tabs
 *   defaultTab="profile"
 *   tabs={[
 *     { id: "profile", label: "Profile", content: <ProfileForm /> },
 *     { id: "billing", label: "Billing", content: <BillingSection /> },
 *   ]}
 * />
 * ```
 */
export function Tabs({
  tabs,
  defaultTab,
  className,
}: TabsProps): React.ReactElement {
  const [activeId, setActiveId] = useState<string>(
    defaultTab ?? (tabs.length > 0 ? tabs[0].id : "")
  );

  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div className={cn("", className)}>
      {/* Tab list */}
      <div
        role="tablist"
        className="flex gap-0 overflow-x-auto border-b border-gray-200 dark:border-gray-700"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors -mb-px",
                isActive
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panel */}
      {activeTab && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
