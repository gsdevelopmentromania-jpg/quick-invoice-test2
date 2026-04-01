import Link from "next/link";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  badge?: string;
  features: PlanFeature[];
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For freelancers just getting started.",
    cta: "Get started free",
    ctaHref: "/register",
    highlighted: false,
    features: [
      { text: "Up to 3 invoices per month", included: true },
      { text: "Up to 2 clients", included: true },
      { text: "PDF download", included: true },
      { text: "Stripe payment link", included: true },
      { text: "Automatic reminders", included: false },
      { text: "Unlimited invoices & clients", included: false },
      { text: "Invoice duplication", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "For active freelancers who invoice regularly.",
    cta: "Start 14-day free trial",
    ctaHref: "/register?plan=pro",
    highlighted: true,
    badge: "Most popular",
    features: [
      { text: "Unlimited invoices", included: true },
      { text: "Unlimited clients", included: true },
      { text: "PDF download", included: true },
      { text: "Stripe payment link", included: true },
      { text: "Automatic reminders", included: true },
      { text: "Invoice duplication", included: true },
      { text: "Real-time status dashboard", included: true },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Business",
    price: "$29",
    period: "per month",
    description: "For agencies and power users who need more.",
    cta: "Start 14-day free trial",
    ctaHref: "/register?plan=business",
    highlighted: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Team members (up to 5)", included: true },
      { text: "Custom invoice branding", included: true },
      { text: "API access", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Invoice duplication", included: true },
      { text: "Real-time status dashboard", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

function CheckIcon({ included }: { included: boolean }): React.ReactElement {
  if (included) {
    return (
      <svg
        className="w-5 h-5 text-indigo-600 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PricingSection(): React.ReactElement {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            No hidden fees. No percentage cut on payments. Cancel any time.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-200 dark:shadow-indigo-900 ring-2 ring-indigo-600"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`text-lg font-bold mb-1 ${
                    plan.highlighted ? "text-white" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-4 ${
                    plan.highlighted ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlighted ? "text-white" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.highlighted ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
              </div>

              <Link
                href={plan.ctaHref}
                className={`inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-semibold transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  plan.highlighted
                    ? "bg-white text-indigo-700 hover:bg-indigo-50 focus-visible:ring-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500"
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    <CheckIcon included={feature.included} />
                    <span
                      className={`text-sm ${
                        plan.highlighted
                          ? feature.included
                            ? "text-indigo-100"
                            : "text-indigo-300 line-through"
                          : feature.included
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-300 dark:text-gray-600 line-through"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Money-back note */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
          All paid plans include a 14-day free trial. No credit card required to
          start.
        </p>
      </div>
    </section>
  );
}
