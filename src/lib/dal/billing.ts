/**
 * Billing Data Access Layer
 */

import prisma from "@/lib/prisma";
import type { Subscription } from "@prisma/client";

/**
 * Return the most recent active (or trialing / past-due) subscription for a user.
 */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Return all subscriptions for a user, newest first.
 */
export async function getAllSubscriptions(userId: string): Promise<Subscription[]> {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Return a subscription by its Stripe subscription ID.
 */
export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  return prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });
}
