import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { Badge, getInvoiceStatusVariant } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "View Invoice",
  robots: { index: false, follow: false },
};

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface PublicInvoicePageProps {
  params: { id: string };
}

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { name: true } },
      user: { select: { businessName: true, businessAddress: true, logoUrl: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      activities: {
        where: { type: "SENT" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Invoice Not Found</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This invoice may have been removed or the link is no longer valid.
            Please contact the sender for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const sentActivity = invoice.activities[0];
  const paymentUrl: string | null =
    sentActivity && sentActivity.metadata
      ? ((sentActivity.metadata as { paymentUrl?: string }).paymentUrl ?? null)
      : null;

  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";
  const isOverdue = invoice.status === "OVERDUE";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Sender branding */}
        <div className="text-center">
          {invoice.user.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invoice.user.logoUrl}
              alt={invoice.user.businessName ?? "Business logo"}
              className="h-12 mx-auto mb-3 object-contain"
            />
          )}
          {invoice.user.businessName && (
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {invoice.user.businessName}
            </p>
          )}
          {invoice.user.businessAddress && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {invoice.user.businessAddress}
            </p>
          )}
        </div>

        {/* Invoice card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Invoice
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {invoice.invoiceNumber}
              </p>
            </div>
            <Badge variant={getInvoiceStatusVariant(invoice.status)}>
              {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
            </Badge>
          </div>

          {/* Bill-to + dates */}
          <div className="px-6 py-5 grid grid-cols-2 gap-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Bill To
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {invoice.client.name}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
                  Issue Date
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {formatDate(invoice.issueDate)}
                </p>
              </div>
              <div>
                <p
                  className={
                    "text-xs font-medium uppercase tracking-wide mb-0.5 " +
                    (isOverdue
                      ? "text-red-500"
                      : "text-gray-400 dark:text-gray-500")
                  }
                >
                  Due Date
                </p>
                <p
                  className={
                    "text-sm " +
                    (isOverdue
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : "text-gray-700 dark:text-gray-300")
                  }
                >
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-3 pr-4">Description</th>
                  <th className="text-right pb-3 pr-4 whitespace-nowrap">Qty</th>
                  <th className="text-right pb-3 pr-4 whitespace-nowrap">Unit Price</th>
                  <th className="text-right pb-3 whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">
                      {item.description}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-600 dark:text-gray-400">
                      {item.quantity.toString()}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-800 dark:text-gray-200">
                      {formatCurrency(item.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                </div>
              )}
              {invoice.taxRate && Number(invoice.taxRate) > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Tax ({invoice.taxRate.toString()}%)</span>
                  <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800">
            {isPaid ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <svg
                  className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  This invoice has been paid — thank you!
                </span>
              </div>
            ) : isCancelled ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                This invoice has been cancelled.
              </p>
            ) : paymentUrl ? (
              <a
                href={paymentUrl}
                className={
                  "flex items-center justify-center w-full h-11 px-6 rounded-xl " +
                  "bg-indigo-600 text-white text-base font-medium " +
                  "hover:bg-indigo-700 transition-colors " +
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                }
                rel="noopener noreferrer"
              >
                Pay Now &mdash; {formatCurrency(invoice.total, invoice.currency)}
              </a>
            ) : (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Contact the sender to arrange payment.
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Powered by <span className="font-medium">Quick Invoice</span>
        </p>
      </div>
    </div>
  );
}
