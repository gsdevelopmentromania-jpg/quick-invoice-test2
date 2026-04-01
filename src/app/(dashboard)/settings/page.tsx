import type { Metadata } from "next";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Settings",
};

const TABS = ["Profile", "Business", "Billing", "Notifications", "Integrations"];

export default function SettingsPage(): React.ReactElement {
  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage your account and business preferences.</p>
      </div>

      {/* Tab bar placeholder */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-0">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={[
              "flex-shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              i === 0
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panel placeholder — will be replaced with real settings in feature task */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5 max-w-xl">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-700">Profile</p>
          <p className="text-xs text-gray-400">Your personal and business information.</p>
        </div>

        <div className="space-y-4 pt-2 border-t border-gray-100">
          {[
            "Full name",
            "Email address",
            "Business name",
            "Business address",
            "Phone number",
          ].map((label) => (
            <div key={label} className="space-y-1">
              <SkeletonText className="w-28 h-3" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}

          <div className="pt-2 flex justify-end gap-3">
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
