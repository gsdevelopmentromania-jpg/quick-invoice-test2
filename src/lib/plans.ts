/**
 * Static plan configuration — safe to import in both server and client components.
 * No server-side dependencies (no Prisma, no Stripe, no env vars).
 */

import type { Plan } from "@prisma/client";

export interface PlanLimits {
  /** Max invoices creatable per calendar month. null = unlimited. */
  invoicesPerMonth: number | null;
  /** Max total active clients. null = unlimited. */
  clients: number | null;
}

export interface PlanFeatures {
  pdfDownloads: boolean;
  customBranding: boolean;
  paymentReminders: boolean;
  /** Max team members. null = unlimited. */
  maxTeamMembers: number | null;
  prioritySupport: boolean;
  trialDays: number;
}

export interface PlanConfig {
  id: Plan;
  name: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number | null;
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
}

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free",
    monthlyPriceUsd: 0,
    annualPriceUsd: null,
    limits: { invoicesPerMonth: 3, clients: 5 },
    features: {
      pdfDownloads: false,
      customBranding: false,
      paymentReminders: false,
      maxTeamMembers: 1,
      prioritySupport: false,
      trialDays: 0,
    },
    highlights: [
      "Up to 3 invoices / month",
      "Up to 5 clients",
      "Stripe payment links",
      "Basic invoice templates",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    monthlyPriceUsd: 12,
    annualPriceUsd: 99,
    limits: { invoicesPerMonth: null, clients: null },
    features: {
      pdfDownloads: true,
      customBranding: true,
      paymentReminders: true,
      maxTeamMembers: 1,
      prioritySupport: true,
      trialDays: 14,
    },
    highlights: [
      "Unlimited invoices",
      "Unlimited clients",
      "PDF downloads",
      "Custom branding & logo",
      "Automated payment reminders",
      "Priority support",
    ],
  },
  TEAM: {
    id: "TEAM",
    name: "Enterprise",
    monthlyPriceUsd: 29,
    annualPriceUsd: 249,
    limits: { invoicesPerMonth: null, clients: null },
    features: {
      pdfDownloads: true,
      customBranding: true,
      paymentReminders: true,
      maxTeamMembers: null,
      prioritySupport: true,
      trialDays: 14,
    },
    highlights: [
      "Everything in Pro",
      "Unlimited team members",
      "Team collaboration",
      "Advanced analytics",
      "Dedicated account manager",
      "Custom integrations",
    ],
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLAN_CONFIGS[plan];
}
