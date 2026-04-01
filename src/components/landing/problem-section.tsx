const painPoints = [
  {
    id: "manual",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Invoicing eats your billable hours",
    description:
      "You spend 30–60 minutes per invoice chasing the right Word template, reformatting numbers, and emailing PDFs that get lost in spam. Time you could have billed.",
  },
  {
    id: "chasing",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Chasing payments is awkward and slow",
    description:
      "Late payments average 29 days overdue for freelancers. You send a polite nudge, wait, send another — meanwhile your cash flow suffers and the client relationship gets weird.",
  },
  {
    id: "scattered",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
      </svg>
    ),
    title: "Your client data is scattered everywhere",
    description:
      "Contact details in your email, project details in Notion, payment history in a spreadsheet. Tax season turns into a treasure hunt, and you end up missing deductions.",
  },
];

export function ProblemSection(): React.ReactElement {
  return (
    <section id="problem" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-3">
            Sound familiar?
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Freelancing is hard enough.
            <br />
            Invoicing shouldn&apos;t make it harder.
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Most freelancers lose an average of 5–8 billable hours a month to administrative work.
            Here&apos;s what we hear most often.
          </p>
        </div>

        {/* Pain point cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {painPoints.map((point, idx) => (
            <div
              key={point.id}
              className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              {/* Number */}
              <span className="absolute top-5 right-5 text-5xl font-extrabold text-gray-100 dark:text-gray-700 select-none leading-none" aria-hidden="true">
                {idx + 1}
              </span>

              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500">
                {point.icon}
              </div>

              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{point.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
