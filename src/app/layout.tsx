import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Analytics } from "@/components/analytics/analytics";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Quick Invoice — Invoice faster, get paid sooner",
    template: "%s | Quick Invoice",
  },
  description:
    "The fastest way for freelancers to create a professional invoice, collect payment via Stripe, and download a clean PDF — all in under two minutes.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://quickinvoice.app"
  ),
  keywords: [
    "invoice freelancers",
    "freelance invoice",
    "online invoicing for freelancers",
    "free invoice generator",
    "best invoicing app for freelancers 2026",
    "invoice with stripe payment",
    "professional invoice template",
    "freelance billing software",
    "invoice pdf generator",
    "get paid faster freelancer",
  ],
  authors: [{ name: "Quick Invoice" }],
  creator: "Quick Invoice",
  publisher: "Quick Invoice",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://quickinvoice.app",
    siteName: "Quick Invoice",
    title: "Quick Invoice — Invoice faster, get paid sooner",
    description:
      "The fastest way for freelancers to create a professional invoice, collect payment via Stripe, and download a clean PDF — all in under two minutes.",
    images: [
      {
        url: "/og-image.png",
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
      "The fastest way for freelancers to create a professional invoice, collect payment via Stripe, and download a clean PDF — all in under two minutes.",
    images: ["/og-image.png"],
    creator: "@quickinvoice",
    site: "@quickinvoice",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
