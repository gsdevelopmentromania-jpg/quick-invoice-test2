"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How quickly can I send my first invoice?",
    answer:
      "Most users send their first invoice within two minutes of signing up. Fill in your client's details, add your line items, and hit send — Quick Invoice handles formatting, PDF generation, and the Stripe payment link automatically.",
  },
  {
    question: "Does Quick Invoice accept online payments?",
    answer:
      "Yes. Quick Invoice integrates directly with Stripe so your clients can pay by credit card, debit card, or bank transfer right from the invoice link. You receive funds directly in your connected Stripe account — we never touch your money.",
  },
  {
    question: "Can I download my invoices as PDFs?",
    answer:
      "Yes. Every invoice you create generates a professionally formatted PDF that you can download instantly, attach to an email, or archive for your records. Your accountant will love you for it.",
  },
  {
    question: "How much does Quick Invoice cost?",
    answer:
      "Quick Invoice offers a free plan (up to 3 invoices/month) and a Pro plan at $12/month for unlimited invoices and clients. There are no percentage fees on payments — you keep 100% of what Stripe sends you (minus Stripe's standard processing fees).",
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer:
      "Absolutely. You can cancel from your account settings at any time. Your subscription remains active until the end of your current billing period, and you will not be charged again after that.",
  },
  {
    question: "What happens to my invoices if I downgrade to the free plan?",
    answer:
      "All your existing invoices and client data are preserved. You simply lose the ability to create more than 3 new invoices per month until you upgrade again. Nothing is ever deleted.",
  },
  {
    question: "Is Quick Invoice secure?",
    answer:
      "Yes. All data is encrypted in transit (TLS) and at rest. Payments are handled entirely by Stripe — we never store your clients' card details. Your account is protected by email verification and optional two-factor authentication.",
  },
];

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform duration-200 ${
        open ? "rotate-180" : "rotate-0"
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FaqItem({
  item,
  index,
}: {
  item: FaqItem;
  index: number;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const id = `faq-answer-${index}`;
  const buttonId = `faq-button-${index}`;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded"
      >
        <span className="text-base font-semibold text-gray-900 dark:text-white">
          {item.question}
        </span>
        <ChevronIcon open={open} />
      </button>
      <div
        id={id}
        role="region"
        aria-labelledby={buttonId}
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

export function FaqSection(): React.ReactElement {
  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Frequently asked questions
          </h2>
        </div>

        {/* Accordion */}
        <div
          className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-2xl px-6"
          role="list"
        >
          {faqs.map((faq, i) => (
            <div key={faq.question} role="listitem">
              <FaqItem item={faq} index={i} />
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
          Still have questions?{" "}
          <a
            href="mailto:hello@quickinvoice.app"
            className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
          >
            Drop us a line
          </a>{" "}
          and we&apos;ll get back to you within one business day.
        </p>
      </div>
    </section>
  );
}
