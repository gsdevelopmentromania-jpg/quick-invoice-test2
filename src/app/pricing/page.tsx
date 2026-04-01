import Link from "next/link";
import type { Metadata } from "next";
import { PLAN_CONFIGS } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for freelancers and teams. Start free — no credit card required.",
};

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

export default function PricingPage(): React.ReactElement {
  const { FREE, PRO, TEAM } = PLAN_CONFIGS;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Quick Invoice
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Start free, upgrade when you need more. No surprise fees.
            <br />
            <strong className="text-gray-700 dark:text-gray-300">14-day free trial</strong> on paid plans — no credit
            card required.
          </p>
        </div>
      </header>

      {/* Pricing cards */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {FREE.name}
              </p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$0</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ month</span>
              </p>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Perfect for getting started. No credit card required.
              </p>
              <ul className="mt-8 space-y-3">
                {FREE.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckIcon />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/register"
              className="mt-8 block rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Get started free
            </Link>
          </div>

          {/* Pro — highlighted */}
          <div className="relative flex flex-col rounded-2xl border-2 border-indigo-600 bg-white dark:bg-gray-800 p-8 shadow-lg">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Most popular
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                {PRO.name}
              </p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                  ${PRO.monthlyPriceUsd}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ month</span>
              </p>
              {PRO.annualPriceUsd && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  or ${PRO.annualPriceUsd}/yr (save{" "}
                  {Math.round(
                    100 - (PRO.annualPriceUsd / (PRO.monthlyPriceUsd * 12)) * 100
                  )}
                  %)
                </p>
              )}
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Everything you need to run a professional invoicing business.
              </p>
              <ul className="mt-8 space-y-3">
                {PRO.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckIcon />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href={`/register?plan=PRO`}
              className="mt-8 block rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Start 14-day free trial
            </Link>
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              No credit card required
            </p>
          </div>

          {/* Enterprise (TEAM) */}
          <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-8 shadow-sm">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {TEAM.name}
              </p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                  ${TEAM.monthlyPriceUsd}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ month</span>
              </p>
              {TEAM.annualPriceUsd && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  or ${TEAM.annualPriceUsd}/yr (save{" "}
                  {Math.round(
                    100 - (TEAM.annualPriceUsd / (TEAM.monthlyPriceUsd * 12)) * 100
                  )}
                  %)
                </p>
              )}
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Designed for growing teams and agencies.
              </p>
              <ul className="mt-8 space-y-3">
                {TEAM.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckIcon />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href={`/register?plan=TEAM`}
              className="mt-8 block rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Start 14-day free trial
            </Link>
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              No credit card required
            </p>
          </div>
        </div>

        {/* FAQ-style notes */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All plans include SSL encryption, 99.9% uptime SLA, and GDPR-compliant data
            processing.{" "}
            <Link href="/register" className="font-medium text-indigo-600 hover:underline">
              Get started free →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
