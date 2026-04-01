/**
 * Server-side billing helpers: feature gates, usage checks, Stripe customer management.
 * This module must only be imported from server-side code (API routes / server components).
 * For static plan config (safe on client too), use @/lib/plans.
 */

import { Plan } from "@prisma/client";
import prisma from "@/lib/prisma";

export type { PlanLimits, PlanFeatures, PlanConfig } from "@/lib/plans";
export { PLAN_CONFIGS, getPlanConfig } from "@/lib/plans";

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

import { getPlanConfig } from "@/lib/plans";

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
