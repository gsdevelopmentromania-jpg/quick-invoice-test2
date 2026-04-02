import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Payment Confirmed",
  robots: { index: false, follow: false },
};

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

interface ThankYouPageProps {
  params: { id: string };
}

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: {
      invoiceNumber: true,
      total: true,
      currency: true,
      client: { select: { name: true } },
      user: { select: { businessName: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center space-y-6">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Payment Received!
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {invoice && invoice.client.name
                ? "Thank you, " + invoice.client.name + ". Your payment has been processed successfully."
                : "Your payment has been processed successfully."}
            </p>
          </div>

          {/* Invoice summary */}
          {invoice && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-6 py-4 space-y-3 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Invoice</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {invoice.invoiceNumber}
                </span>
              </div>
              {invoice.user.businessName && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Billed by</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {invoice.user.businessName}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Info note */}
          <p className="text-sm text-gray-400 dark:text-gray-500">
            A payment confirmation has been sent by Stripe. You can safely close this page.
          </p>

          {/* View invoice link */}
          <Link
            href={"/invoice/" + params.id}
            className="inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded"
          >
            View Invoice &rarr;
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Powered by <span className="font-medium">Quick Invoice</span>
        </p>
      </div>
    </div>
  );
}
