import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { HeroSection } from "@/components/landing/hero-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { FeaturesSection } from "@/components/landing/features-section";

export const metadata: Metadata = {
  title: "Quick Invoice — Invoice faster, get paid sooner",
  description:
    "Create a professional invoice, collect Stripe payment, and download a clean PDF in under two minutes. Built for freelancers.",
};

export default function HomePage(): React.ReactElement {
  return (
    <>
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
