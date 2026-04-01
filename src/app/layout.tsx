import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Analytics } from "@/components/analytics/analytics";
import { JsonLd } from "@/components/seo/json-ld";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quickinvoice.app";

export const metadata: Metadata = {
  title: {
    default: "Quick Invoice — Invoice faster, get paid sooner",
    template: "%s | Quick Invoice",
  },
  description:
    "The fastest way for freelancers to create a professional invoice, collect payment via Stripe, and download a clean PDF — all in under two minutes.",
  metadataBase: new URL(BASE_URL),
  keywords: [
    "invoice app for freelancers",
    "freelance invoicing software",
    "online invoice generator",
    "invoice clients freelancer",
    "stripe invoice",
    "professional invoice template",
    "get paid faster freelancer",
    "invoice pdf generator",
  ],
  authors: [{ name: "Quick Invoice" }],
  creator: "Quick Invoice",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Quick Invoice",
    title: "Quick Invoice — Invoice faster, get paid sooner",
    description:
      "The fastest way for freelancers to create a professional invoice, collect payment via Stripe, and download a clean PDF — all in under two minutes.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Quick Invoice — Invoice faster, get paid sooner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quick Invoice — Invoice faster, get paid sooner",
    description:
      "The fastest way for freelancers to create a professional invoice and get paid via Stripe — in under two minutes.",
    images: [`${BASE_URL}/og-image.png`],
    creator: "@quickinvoice",
    site: "@quickinvoice",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const organizationSchema = {
  "@type": "Organization" as const,
  name: "Quick Invoice",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    "Quick Invoice is the fastest invoicing tool for freelancers — create, send, and collect Stripe payment on a professional invoice in under two minutes.",
  sameAs: ["https://twitter.com/quickinvoice"],
};

const webSiteSchema = {
  "@type": "WebSite" as const,
  name: "Quick Invoice",
  url: BASE_URL,
  description:
    "Professional invoicing software for freelancers. Create invoices, collect Stripe payments, and download PDFs in under two minutes.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/blog?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const softwareSchema = {
  "@type": "SoftwareApplication" as const,
  name: "Quick Invoice",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Quick Invoice is invoicing software built specifically for freelancers. Create professional invoices, accept Stripe payments, and generate PDFs in under two minutes.",
  offers: [
    {
      "@type": "Offer" as const,
      price: "0",
      priceCurrency: "USD",
      description: "Free plan — up to 3 invoices per month",
    },
    {
      "@type": "Offer" as const,
      price: "12",
      priceCurrency: "USD",
      description: "Pro plan — unlimited invoices and clients",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <JsonLd data={[organizationSchema, webSiteSchema, softwareSchema]} />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
