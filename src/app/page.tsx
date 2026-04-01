import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { HeroSection } from "@/components/landing/hero-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { JsonLd } from "@/components/seo/json-ld";
import type {
  OrganizationJsonLd,
  WebSiteJsonLd,
  SoftwareApplicationJsonLd,
  FaqJsonLd,
} from "@/components/seo/json-ld";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://quickinvoice.app";

export const metadata: Metadata = {
  title: "Quick Invoice — Invoice faster, get paid sooner",
  description:
    "Create a professional invoice, collect Stripe payment, and download a clean PDF in under two minutes. Built for freelancers who want to get paid faster.",
  alternates: {
    canonical: BASE_URL,
  },
};

const organizationSchema: OrganizationJsonLd = {
  "@type": "Organization",
  name: "Quick Invoice",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    "The fastest invoicing tool for freelancers. Create, send, and collect payment on professional invoices in under two minutes.",
  sameAs: ["https://twitter.com/quickinvoice"],
};

const websiteSchema: WebSiteJsonLd = {
  "@type": "WebSite",
  name: "Quick Invoice",
  url: BASE_URL,
  description:
    "Fast, professional invoicing for freelancers. Send invoices, accept Stripe payments, and download PDF receipts in minutes.",
};

const softwareSchema: SoftwareApplicationJsonLd = {
  "@type": "SoftwareApplication",
  name: "Quick Invoice",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Quick Invoice is the fastest online invoicing tool for freelancers. Create professional invoices, accept Stripe payments, and download PDF exports in under two minutes.",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan — up to 3 invoices per month",
    },
    {
      "@type": "Offer",
      price: "12",
      priceCurrency: "USD",
      description: "Pro plan — unlimited invoices and clients",
    },
  ],
};

const faqSchema: FaqJsonLd = {
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How quickly can I send my first invoice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most users send their first invoice within two minutes of signing up. No credit card required to start.",
      },
    },
    {
      "@type": "Question",
      name: "Does Quick Invoice accept online payments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Quick Invoice integrates directly with Stripe so your clients can pay by credit card, debit card, or bank transfer right from the invoice link.",
      },
    },
    {
      "@type": "Question",
      name: "Can I download my invoices as PDFs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Every invoice you create generates a professionally formatted PDF that you can download and send to your clients.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Quick Invoice cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Quick Invoice offers a free plan (up to 3 invoices/month) and a Pro plan at $12/month for unlimited invoices and clients. No percentage fees on payments.",
      },
    },
    {
      "@type": "Question",
      name: "Is Quick Invoice good for freelancers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Quick Invoice is built specifically for freelancers — designers, developers, copywriters, and consultants. It focuses entirely on the invoice-to-payment flow without unnecessary features.",
      },
    },
  ],
};

export default function HomePage(): React.ReactElement {
  return (
    <>
      <JsonLd
        data={[organizationSchema, websiteSchema, softwareSchema, faqSchema]}
      />
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
      </main>
    </>
  );
}
