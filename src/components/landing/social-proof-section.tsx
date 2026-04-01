const testimonials = [
  {
    quote:
      "I used to spend 30 minutes per invoice wrestling with spreadsheets. Quick Invoice cut that to two minutes. The Stripe integration means clients actually pay on time now.",
    name: "Sarah Chen",
    role: "Freelance Web Designer",
    initials: "SC",
    color: "bg-indigo-500",
  },
  {
    quote:
      "I sent my first invoice 5 minutes after signing up. No onboarding headache, no tutorial videos — it just works. My accountant loves the PDF exports too.",
    name: "Marcus Rivera",
    role: "Independent Consultant",
    initials: "MR",
    color: "bg-purple-500",
  },
  {
    quote:
      "The automatic payment reminders alone are worth it. I stopped having those awkward 'hey, my invoice is overdue' conversations. Clients just pay.",
    name: "Priya Nair",
    role: "UX Copywriter",
    initials: "PN",
    color: "bg-emerald-500",
  },
];

const metrics = [
  { value: "2 min", label: "Average time to send your first invoice" },
  { value: "3×", label: "Faster payment vs email-only invoicing" },
  { value: "98%", label: "Customer satisfaction score" },
];

const trustedBy = [
  "Acme Design",
  "Nova Studio",
  "Bright Copy",
  "Summit Dev",
  "Pixel & Co",
  "Craft Labs",
];

function StarRating(): React.ReactElement {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className="w-4 h-4 text-amber-400 fill-current"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function SocialProofSection(): React.ReactElement {
  return (
    <section id="social-proof" className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">
            Loved by freelancers
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Real freelancers. Real results.
          </h2>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <p className="text-4xl font-bold text-indigo-600 mb-1">
                {metric.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-4 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-indigo-100 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <StarRating />
              <blockquote className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trusted by */}
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {trustedBy.map((name) => (
              <span
                key={name}
                className="text-gray-300 dark:text-gray-600 font-semibold text-lg tracking-tight select-none"
                aria-label={name}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
