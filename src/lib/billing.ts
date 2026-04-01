/**
 * Billing — plan configuration, feature gates, and usage helpers.
 * This module must only be imported from server-side code (API routes / server components).
 */

import { Plan } from "@prisma/client";
import prisma from "@/lib/prisma";

// ─── Plan definitions ──────────────────────────────────────────────────────

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

/** Return the Stripe Price ID for a given plan (server-side only). */
export function getStripePriceId(plan: Plan): string | undefined {
  switch (plan) {
    case "PRO":
      return process.env.STRIPE_PRO_PRICE_ID;
    case "TEAM":
      return process.env.STRIPE_TEAM_PRICE_ID;
    default:
      return undefined;
  }
}

/** Derive a Plan from a Stripe Price ID. */
export function planFromPriceId(priceId: string): Plan {
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return "TEAM";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PRO";
  return "FREE";
}

// ─── Feature gates ─────────────────────────────────────────────────────────

export async function canCreateInvoice(userId: string, plan: Plan): Promise<boolean> {
  const { limits } = getPlanConfig(plan);
  if (limits.invoicesPerMonth === null) return true;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = await prisma.invoice.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  });

  return count < limits.invoicesPerMonth;
}

export async function canCreateClient(userId: string, plan: Plan): Promise<boolean> {
  const { limits } = getPlanConfig(plan);
  if (limits.clients === null) return true;

  const count = await prisma.client.count({ where: { userId } });
  return count < limits.clients;
}

export function canDownloadPDF(plan: Plan): boolean {
  return getPlanConfig(plan).features.pdfDownloads;
}

export function canUseCustomBranding(plan: Plan): boolean {
  return getPlanConfig(plan).features.customBranding;
}

export function canSendReminders(plan: Plan): boolean {
  return getPlanConfig(plan).features.paymentReminders;
}

// ─── Usage helpers ─────────────────────────────────────────────────────────

export interface UserUsage {
  invoicesThisMonth: number;
  totalClients: number;
}

export async function getUserUsage(userId: string): Promise<UserUsage> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [invoicesThisMonth, totalClients] = await Promise.all([
    prisma.invoice.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
    prisma.client.count({ where: { userId } }),
  ]);

  return { invoicesThisMonth, totalClients };
}

// ─── Stripe customer helper ────────────────────────────────────────────────

/**
 * Return the user's existing Stripe customer ID, or create a new customer
 * and persist it to the database if one doesn't exist yet.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Dynamic import avoids referencing stripe in client bundles
  const stripe = (await import("@/lib/stripe")).default;

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
