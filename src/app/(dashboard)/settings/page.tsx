"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";

type Tab = "profile" | "notifications" | "billing";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "billing", label: "Billing" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "es-ES", label: "Español" },
];

interface NotifPref {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

function ProfileTab(): React.ReactElement {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [locale, setLocale] = useState("en-US");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    try {
      const body = {
        fullName: fullName.trim() || undefined,
        businessName: businessName.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        businessPhone: businessPhone.trim() || undefined,
        currency,
        locale,
      };

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to save profile.");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)}>
      <div className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            Profile saved successfully.
          </div>
        )}

        {/* Personal */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">
              Personal Info
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Your name and contact details.
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              id="fullName"
              label="Full Name"
              placeholder="Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </CardBody>
        </Card>

        {/* Business */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">
              Business Details
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Appears on your invoices.
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="businessName"
                label="Business Name"
                placeholder="Acme Consulting LLC"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoComplete="organization"
              />
              <Input
                id="businessPhone"
                label="Business Phone"
                type="tel"
                placeholder="+1 555 000 0000"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <Textarea
              id="businessAddress"
              label="Business Address"
              placeholder={"123 Main St\nCity, State 00000\nCountry"}
              rows={3}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              autoComplete="street-address"
            />
          </CardBody>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">
              Preferences
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="currency"
                label="Default Currency"
                options={CURRENCY_OPTIONS}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
              <Select
                id="locale"
                label="Language / Locale"
                options={LOCALE_OPTIONS}
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              />
            </div>
          </CardBody>
          <CardFooter>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={loading}
              >
                Save Changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        enabled ? "bg-indigo-600" : "bg-gray-200"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function NotificationsTab(): React.ReactElement {
  const [prefs, setPrefs] = useState<NotifPref[]>([
    {
      id: "invoice_sent",
      label: "Invoice sent confirmation",
      description: "Get an email when an invoice is sent to your client.",
      enabled: true,
    },
    {
      id: "invoice_viewed",
      label: "Invoice viewed",
      description: "Get notified when your client opens an invoice.",
      enabled: true,
    },
    {
      id: "invoice_paid",
      label: "Payment received",
      description: "Get an email when an invoice is marked as paid.",
      enabled: true,
    },
    {
      id: "invoice_overdue",
      label: "Overdue reminders",
      description: "Receive a reminder when an invoice becomes overdue.",
      enabled: false,
    },
    {
      id: "weekly_summary",
      label: "Weekly summary",
      description: "A weekly digest of your invoicing activity.",
      enabled: false,
    },
  ]);

  function toggle(id: string, value: boolean): void {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: value } : p))
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-900">
          Email Notifications
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Choose which events trigger an email to you.
        </p>
      </CardHeader>
      <CardBody className="p-0">
        <ul className="divide-y divide-gray-50">
          {prefs.map((pref) => (
            <li key={pref.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{pref.description}</p>
              </div>
              <Toggle
                enabled={pref.enabled}
                onChange={(v) => toggle(pref.id, v)}
                label={pref.label}
              />
            </li>
          ))}
        </ul>
      </CardBody>
      <CardFooter>
        <div className="flex justify-end">
          <Button variant="primary" size="md">
            Save Preferences
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function BillingTab(): React.ReactElement {
  return (
    <div className="space-y-5">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">
            Current Plan
          </h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">Free</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  Current
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Up to 3 active invoices per month. No payment required.
              </p>
            </div>
            <Button variant="primary" size="md">
              Upgrade to Pro
            </Button>
          </div>

          {/* Usage bar */}
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs text-gray-500">
              <span>Invoices this month</span>
              <span>3 / 3 used</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{ width: "100%" }}
                role="progressbar"
                aria-valuenow={3}
                aria-valuemin={0}
                aria-valuemax={3}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Pro plan card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Pro Plan</h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              Recommended
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-2xl font-bold text-gray-900">
            $12{" "}
            <span className="text-base font-normal text-gray-500">/ month</span>
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              "Unlimited invoices",
              "PDF downloads",
              "Automated payment reminders",
              "Custom branding & logo",
              "Priority support",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </CardBody>
        <CardFooter>
          <Button variant="primary" size="md" className="w-full">
            Upgrade to Pro — $12/mo
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SettingsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account, billing, and preferences.
          </p>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "billing" && <BillingTab />}
      </div>
    </div>
  );
}
