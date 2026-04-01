import Link from "next/link";

function InvoiceDemo(): React.ReactElement {
  return (
    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-md w-full">
      {/* Header bar */}
      <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">Invoice</p>
          <p className="text-white font-bold text-lg">#INV-0042</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-400 text-green-900">
          Paid
        </span>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4">
        {/* Client & date */}
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Bill to</p>
            <p className="font-semibold text-gray-900">Acme Corp</p>
            <p className="text-gray-500">acme@example.com</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs mb-0.5">Due date</p>
            <p className="font-semibold text-gray-900">Apr 15, 2026</p>
            <p className="text-gray-500">Net 30</p>
          </div>
        </div>

        {/* Line items */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          {[
            { desc: "Website redesign", qty: 1, amount: "$2,400.00" },
            { desc: "SEO audit", qty: 1, amount: "$600.00" },
          ].map((item) => (
            <div key={item.desc} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.desc}</span>
              <span className="font-medium text-gray-900">{item.amount}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Total</span>
          <span className="text-xl font-bold text-indigo-600">$3,000.00</span>
        </div>

        {/* Stripe pay button (decorative) */}
        <div className="pt-1">
          <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-semibold text-indigo-700">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
            </svg>
            Pay with Stripe
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection(): React.ReactElement {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-indigo-50/60 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" aria-hidden="true" />
              Built for freelancers &amp; solo operators
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
              Get paid{" "}
              <span className="text-indigo-600">faster</span>
              {" "}without the paperwork
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-lg">
              Create a professional invoice, collect payment via Stripe, and download a clean PDF
              — all in under two minutes. No accountant required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center h-12 px-8 text-base font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Send your first invoice free
              </Link>
              <Link
                href="#solution"
                className="inline-flex items-center justify-center h-12 px-8 text-base font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                See how it works
              </Link>
            </div>

            <p className="mt-5 text-sm text-gray-400">
              No credit card required &middot; Free plan available
            </p>
          </div>

          {/* Demo */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Decorative blobs */}
              <div
                className="absolute -top-6 -right-6 w-64 h-64 bg-indigo-200 rounded-full opacity-20 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-6 -left-6 w-48 h-48 bg-purple-200 rounded-full opacity-20 blur-3xl"
                aria-hidden="true"
              />
              <InvoiceDemo />

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 bg-white rounded-xl shadow-lg px-4 py-2.5 border border-gray-100">
                <span className="text-green-500 text-lg" aria-hidden="true">✓</span>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Payment received</p>
                  <p className="text-xs text-gray-500">2 min after sending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
