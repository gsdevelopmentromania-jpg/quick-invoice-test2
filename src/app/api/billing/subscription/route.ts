import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActiveSubscription } from "@/lib/dal/billing";
import { getUserUsage, getPlanConfig } from "@/lib/billing";
import type { ApiResponse } from "@/types";
import type { Plan, SubscriptionStatus } from "@prisma/client";
import { unauthorized, serverError } from "@/lib/errors";

export interface SubscriptionDetails {
  plan: Plan;
  planName: string;
  status: SubscriptionStatus | null;
  stripeSubscriptionId: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  usage: {
    invoicesThisMonth: number;
    invoicesLimit: number | null;
    totalClients: number;
    clientsLimit: number | null;
  };
}

/**
 * GET /api/billing/subscription
 * Returns the current user's plan, subscription status, and usage.
 */
export async function GET(
  _req: NextRequest
): Promise<NextResponse<ApiResponse<SubscriptionDetails>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const [user, sub, usage] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true, stripeCustomerId: true },
      }),
      getActiveSubscription(session.user.id),
      getUserUsage(session.user.id),
    ]);

    if (!user) {
      return unauthorized();
    }

    const planConfig = getPlanConfig(user.plan);

    const details: SubscriptionDetails = {
      plan: user.plan,
      planName: planConfig.name,
      status: sub?.status ?? null,
      stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
      trialEnd: sub?.status === "TRIALING" ? sub.currentPeriodEnd.toISOString() : null,
      currentPeriodEnd: sub?.currentPeriodEnd.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      hasStripeCustomer: Boolean(user.stripeCustomerId),
      usage: {
        invoicesThisMonth: usage.invoicesThisMonth,
        invoicesLimit: planConfig.limits.invoicesPerMonth,
        totalClients: usage.totalClients,
        clientsLimit: planConfig.limits.clients,
      },
    };

    return NextResponse.json({ data: details });
  } catch (err) {
    console.error("[billing/subscription] error:", err);
    return serverError();
  }
}
