import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import stripe from "@/lib/stripe";
import { getActiveSubscription } from "@/lib/dal/billing";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";
import { unauthorized, badRequest, serverError } from "@/lib/errors";

/**
 * POST /api/billing/reactivate
 * Removes a pending cancellation so the subscription continues after the current period.
 */
export async function POST(
  _req: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  const sub = await getActiveSubscription(session.user.id);
  if (!sub) {
    return badRequest("No active subscription found.");
  }

  if (!sub.cancelAtPeriodEnd) {
    return badRequest("Subscription is not scheduled to cancel.");
  }

  try {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await prisma.subscription.update({
      where: { stripeSubscriptionId: sub.stripeSubscriptionId },
      data: { cancelAtPeriodEnd: false },
    });

    return NextResponse.json({
      data: { message: "Subscription has been reactivated." },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[billing/reactivate] error:", err);
    return serverError(message);
  }
}
