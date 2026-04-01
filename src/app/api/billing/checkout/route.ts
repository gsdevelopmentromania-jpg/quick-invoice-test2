import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import stripe from "@/lib/stripe";
import {
  getOrCreateStripeCustomer,
  getStripePriceId,
  getPlanConfig,
} from "@/lib/billing";
import type { ApiResponse } from "@/types";
import { Plan } from "@prisma/client";
import { unauthorized, badRequest, serverError } from "@/lib/errors";

const checkoutSchema = z.object({
  plan: z.nativeEnum(Plan),
  /** If true, start a 14-day free trial (card not required). */
  withTrial: z.boolean().optional().default(true),
  /** URL to redirect on success. Defaults to /dashboard. */
  successUrl: z.string().url().optional(),
  /** URL to redirect on cancel. Defaults to /pricing. */
  cancelUrl: z.string().url().optional(),
});

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for the given plan and returns the URL.
 */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ url: string }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return unauthorized();
  }

  const body: unknown = await req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.errors[0]?.message ?? "Invalid request");
  }

  const { plan, withTrial, successUrl, cancelUrl } = parsed.data;

  if (plan === "FREE") {
    return badRequest("Cannot create a checkout session for the Free plan");
  }

  const priceId = getStripePriceId(plan);
  if (!priceId) {
    return serverError("Stripe price ID not configured for this plan");
  }

  const planConfig = getPlanConfig(plan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email,
      session.user.name
    );

    const trialDays = withTrial ? planConfig.features.trialDays : 0;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
      // Do not require payment method when a trial is active
      payment_method_collection: trialDays > 0 ? "if_required" : "always",
      success_url: successUrl ?? `${appUrl}/dashboard?upgraded=1`,
      cancel_url: cancelUrl ?? `${appUrl}/pricing`,
      metadata: { userId: session.user.id, plan },
      allow_promotion_codes: true,
    });

    if (!checkoutSession.url) {
      return serverError("Failed to create checkout session URL");
    }

    return NextResponse.json({ data: { url: checkoutSession.url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[billing/checkout] error:", err);
    return serverError(message);
  }
}
