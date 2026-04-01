import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://quickinvoice.app"),
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
      </body>
    </html>
  );
}
