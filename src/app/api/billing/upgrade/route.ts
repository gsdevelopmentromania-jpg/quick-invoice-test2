import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import stripe from "@/lib/stripe";
import { getStripePriceId } from "@/lib/billing";
import { getActiveSubscription } from "@/lib/dal/billing";
import type { ApiResponse } from "@/types";
import { Plan } from "@prisma/client";
import { unauthorized, badRequest, serverError } from "@/lib/errors";

const upgradeSchema = z.object({
  plan: z.nativeEnum(Plan),
});

/**
 * POST /api/billing/upgrade
 * Upgrade or downgrade the current subscription to a different paid plan.
 * Creates prorations so billing is adjusted immediately.
 * The webhook (customer.subscription.updated) will sync the new plan to the DB.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  const body: unknown = await req.json();
  const parsed = upgradeSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.errors[0]?.message ?? "Invalid request");
  }

  const { plan } = parsed.data;

  if (plan === "FREE") {
    return badRequest("Cannot switch to Free — cancel your subscription instead.");
  }

  const priceId = getStripePriceId(plan);
  if (!priceId) {
    return serverError("Stripe price ID not configured for this plan.");
  }

  const sub = await getActiveSubscription(session.user.id);
  if (!sub) {
    return badRequest("No active subscription found. Please subscribe first.");
  }

  if (sub.plan === plan) {
    return badRequest("You are already on this plan.");
  }

  try {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const itemId = stripeSub.items.data[0]?.id;

    if (!itemId) {
      return serverError("Could not find subscription item.");
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
    });

    const action = plan === "TEAM" ? "upgraded" : "downgraded";

    return NextResponse.json({
      data: { message: `Plan ${action} to ${plan} successfully.` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[billing/upgrade] error:", err);
    return serverError(message);
  }
}
