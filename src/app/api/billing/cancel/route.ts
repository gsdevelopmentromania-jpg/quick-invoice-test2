import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import stripe from "@/lib/stripe";
import { getActiveSubscription } from "@/lib/dal/billing";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";
import { unauthorized, badRequest, serverError } from "@/lib/errors";

/**
 * POST /api/billing/cancel
 * Cancels the current subscription at the end of the billing period.
 * The user retains access until currentPeriodEnd.
 */
export async function POST(_req: NextRequest): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  const sub = await getActiveSubscription(session.user.id);
  if (!sub) {
    return badRequest("No active subscription found.");
  }

  try {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { stripeSubscriptionId: sub.stripeSubscriptionId },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      data: { message: "Subscription will cancel at the end of the billing period." },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[billing/cancel] error:", err);
    return serverError(message);
  }
}
