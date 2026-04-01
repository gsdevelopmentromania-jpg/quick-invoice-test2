import type { Metadata } from "next";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

const SETTINGS_TABS = [
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Billing" },
  { id: "notifications", label: "Notifications" },
];

export default function SettingsPage(): React.ReactElement {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account, billing, and preferences.
        </p>
      </div>

      {/* Tab nav (visual stub — no JS state needed for shell) */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {SETTINGS_TABS.map((tab, index) => (
          <span
            key={tab.id}
            className={
              index === 0
                ? "rounded-md bg-white px-4 py-1.5 text-sm font-medium text-gray-900 shadow-sm"
                : "px-4 py-1.5 text-sm font-medium text-gray-500"
            }
          >
            {tab.label}
          </span>
        ))}
      </div>

      {/* Profile section placeholder */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Profile</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Your name, business info, and logo.
          </p>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-500">
            Profile settings form will be built in the next feature task.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
