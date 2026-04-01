"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

interface FormErrors {
  name?: string;
  email?: string;
}

export default function NewClientPage(): React.ReactElement {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Client name is required.";
    if (!email.trim()) {
      next.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        currency,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to create client.");
      }

      router.push("/clients");
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Back link + heading */}
        <div>
          <Link
            href="/clients"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to clients
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Add Client</h1>
          <p className="mt-1 text-sm text-gray-500">
            Save client details to reuse across invoices.
          </p>
        </div>

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submitError}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">
                Client Details
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="name"
                  label="Full Name *"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  autoComplete="name"
                />
                <Input
                  id="email"
                  label="Email Address *"
                  type="email"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />
                <Input
                  id="company"
                  label="Company"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
                <Input
                  id="phone"
                  label="Phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
                <Select
                  id="currency"
                  label="Default Currency"
                  options={CURRENCY_OPTIONS}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>

              <Textarea
                id="address"
                label="Billing Address"
                placeholder={"123 Main St\nCity, State 00000\nCountry"}
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
              />

              <Textarea
                id="notes"
                label="Internal Notes"
                placeholder="Any private notes about this client…"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                hint="Not visible on invoices."
              />
            </CardBody>
          </Card>

          {/* Action row */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/clients">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading}
            >
              Save Client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
