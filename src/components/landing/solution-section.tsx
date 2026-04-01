const solutions = [
  {
    id: "fast-invoicing",
    step: "01",
    title: "Create an invoice in 90 seconds",
    description:
      "Fill in a clean form — client, line items, due date. Quick Invoice generates a polished PDF automatically. No design skills, no template hunting, no reformatting.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    solves: "Invoicing eats your billable hours",
  },
  {
    id: "stripe-payments",
    step: "02",
    title: "Clients pay instantly via Stripe",
    description:
      "Every invoice includes a Pay Now button powered by Stripe. Clients pay by card or bank transfer in seconds — you get notified immediately and funds arrive within days.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    solves: "Chasing payments is awkward and slow",
  },
  {
    id: "client-hub",
    step: "03",
    title: "One place for every client & invoice",
    description:
      "All client contacts, project history, and payment records in a single dashboard. Export a clean CSV at tax time or filter by status to see who owes you at a glance.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    solves: "Your client data is scattered everywhere",
  },
];

export function SolutionSection(): React.ReactElement {
  return (
    <section id="solution" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            From invoice to payment in three steps
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Quick Invoice eliminates every friction point between finishing your work and getting paid.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden lg:block absolute top-14 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-indigo-100 via-indigo-300 to-indigo-100 dark:from-indigo-900 dark:via-indigo-600 dark:to-indigo-900"
            aria-hidden="true"
          />

          <div className="grid sm:grid-cols-3 gap-8">
            {solutions.map((solution) => (
              <div key={solution.id} className="relative flex flex-col items-center text-center">
                {/* Step circle */}
                <div className="relative z-10 flex items-center justify-center w-28 h-28 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border-4 border-white dark:border-gray-900 shadow-md mb-6">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white">
                    {solution.icon}
                  </div>
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-700 text-xs font-bold text-indigo-600">
                    {solution.step}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{solution.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 max-w-xs">
                  {solution.description}
                </p>

                {/* Solves badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  Solves: {solution.solves}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
