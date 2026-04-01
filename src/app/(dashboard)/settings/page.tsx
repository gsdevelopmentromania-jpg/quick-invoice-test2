"use client";

import { useState, useEffect } from "react";
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

// ─── Billing helpers ──────────────────────────────────────────────────────────

interface BillingStatus {
  plan: string;
  planName: string;
  status: string | null;
  stripeSubscriptionId: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  usage: {
    invoicesThisMonth: number;
    invoicesLimit: number | null;
    totalClients: number;
    clientsLimit: number | null;
  };
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}): React.ReactElement {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isAtLimit = limit !== null && used >= limit;

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>
          {used}
          {limit !== null ? ` / ${limit}` : ""}{" "}
          {limit === null ? "(unlimited)" : "used"}
        </span>
      </div>
      {limit !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit ? "bg-red-500" : "bg-indigo-600"
            }`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={limit}
          />
        </div>
      )}
    </div>
  );
}

function CheckIcon(): React.ReactElement {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0 text-green-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlanUpgradeCard({
  name,
  price,
  features,
  highlighted,
  ctaLabel,
  ctaLoading,
  ctaDisabled,
  onCta,
}: {
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  ctaLoading: boolean;
  ctaDisabled: boolean;
  onCta: () => void;
}): React.ReactElement {
  return (
    <div
      className={`flex flex-col rounded-xl border p-5 ${
        highlighted
          ? "border-indigo-300 bg-indigo-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          highlighted ? "text-indigo-700" : "text-gray-700"
        }`}
      >
        {name}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">${price}</span>
        <span className="text-sm text-gray-500">/ mo</span>
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>
      <Button
        variant={highlighted ? "primary" : "outline"}
        size="md"
        className="mt-5 w-full"
        loading={ctaLoading}
        disabled={ctaDisabled}
        onClick={onCta}
      >
        {ctaLabel}
      </Button>
      <p className="mt-2 text-center text-xs text-gray-400">
        14-day free trial · No card required
      </p>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

function BillingTab(): React.ReactElement {
  const [sub, setSub] = useState<BillingStatus | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetchSub();
  }, []);

  async function fetchSub(): Promise<void> {
    setLoadingData(true);
    try {
      const res = await fetch("/api/billing/subscription");
      if (res.ok) {
        const json = (await res.json()) as { data?: BillingStatus };
        if (json.data) setSub(json.data);
      }
    } finally {
      setLoadingData(false);
    }
  }

  async function callAction(
    path: string,
    body?: Record<string, unknown>
  ): Promise<void> {
    setActionLoading(path);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/billing/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as {
        data?: { url?: string; message?: string };
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      if (json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      if (json.data?.message) {
        setSuccessMsg(json.data.message);
      }
      await fetchSub();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loadingData) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  const isPaid = sub?.plan === "PRO" || sub?.plan === "TEAM";
  const isTrialing = sub?.status === "TRIALING";
  const isPastDue = sub?.status === "PAST_DUE";
  const willCancel = sub?.cancelAtPeriodEnd ?? false;

  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString()
    : null;
  const trialEnds = sub?.trialEnd
    ? new Date(sub.trialEnd).toLocaleDateString()
    : null;

  const invoicesUsed = sub?.usage.invoicesThisMonth ?? 0;
  const invoicesLimit = sub?.usage.invoicesLimit ?? 3;
  const clientsUsed = sub?.usage.totalClients ?? 0;
  const clientsLimit = sub?.usage.clientsLimit ?? 5;

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {successMsg}
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Current Plan</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-bold text-gray-900">
                  {sub?.planName ?? "Free"}
                </span>
                {isTrialing && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    Trial{trialEnds ? ` · ends ${trialEnds}` : ""}
                  </span>
                )}
                {isPastDue && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Past Due
                  </span>
                )}
                {willCancel && periodEnd && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    Cancels {periodEnd}
                  </span>
                )}
                {isPaid && !isTrialing && !willCancel && !isPastDue && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                )}
              </div>
              {periodEnd && !willCancel && isPaid && (
                <p className="mt-1 text-sm text-gray-500">
                  Next billing: {periodEnd}
                </p>
              )}
              {willCancel && periodEnd && (
                <p className="mt-1 text-sm text-gray-500">
                  Access until: {periodEnd}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {isPaid && !willCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={actionLoading === "cancel"}
                  disabled={actionLoading !== null}
                  onClick={() => void callAction("cancel")}
                >
                  Cancel Plan
                </Button>
              )}
              {willCancel && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={actionLoading === "reactivate"}
                  disabled={actionLoading !== null}
                  onClick={() => void callAction("reactivate")}
                >
                  Keep Plan
                </Button>
              )}
              {sub?.hasStripeCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={actionLoading === "portal"}
                  disabled={actionLoading !== null}
                  onClick={() => void callAction("portal")}
                >
                  Billing Portal
                </Button>
              )}
            </div>
          </div>

          {/* Usage bars */}
          <div className="mt-5 space-y-3">
            <UsageBar
              label="Invoices this month"
              used={invoicesUsed}
              limit={invoicesLimit}
            />
            <UsageBar
              label="Active clients"
              used={clientsUsed}
              limit={clientsLimit}
            />
          </div>
        </CardBody>
      </Card>

      {/* Upgrade options — shown to FREE users */}
      {!isPaid && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanUpgradeCard
            name="Pro"
            price={12}
            features={[
              "Unlimited invoices",
              "PDF downloads",
              "Automated payment reminders",
              "Custom branding & logo",
              "Priority support",
            ]}
            highlighted
            ctaLabel="Start free trial"
            ctaLoading={actionLoading === "checkout-pro"}
            ctaDisabled={actionLoading !== null}
            onCta={() => {
              setActionLoading("checkout-pro");
              void callAction("checkout", { plan: "PRO", withTrial: true });
            }}
          />
          <PlanUpgradeCard
            name="Enterprise"
            price={29}
            features={[
              "Everything in Pro",
              "Unlimited team members",
              "Team collaboration",
              "Advanced analytics",
              "Dedicated account manager",
            ]}
            ctaLabel="Start free trial"
            ctaLoading={actionLoading === "checkout-team"}
            ctaDisabled={actionLoading !== null}
            onCta={() => {
              setActionLoading("checkout-team");
              void callAction("checkout", { plan: "TEAM", withTrial: true });
            }}
          />
        </div>
      )}

      {/* PRO → TEAM upgrade */}
      {sub?.plan === "PRO" && !willCancel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Upgrade to Enterprise
              </h2>
              <span className="text-sm font-medium text-gray-500">$29/mo</span>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600">
              Unlock unlimited team members, advanced analytics, and a dedicated
              account manager. Upgrade takes effect immediately with prorations.
            </p>
          </CardBody>
          <CardFooter>
            <Button
              variant="primary"
              size="md"
              loading={actionLoading === "upgrade"}
              disabled={actionLoading !== null}
              onClick={() => void callAction("upgrade", { plan: "TEAM" })}
            >
              Upgrade to Enterprise
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* TEAM → PRO downgrade */}
      {sub?.plan === "TEAM" && !willCancel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Switch to Pro
              </h2>
              <span className="text-sm font-medium text-gray-500">$12/mo</span>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600">
              Downgrade to Pro — you keep all data and retain access until the
              end of your current billing period.
            </p>
          </CardBody>
          <CardFooter>
            <Button
              variant="outline"
              size="md"
              loading={actionLoading === "upgrade"}
              disabled={actionLoading !== null}
              onClick={() => void callAction("upgrade", { plan: "PRO" })}
            >
              Downgrade to Pro
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
