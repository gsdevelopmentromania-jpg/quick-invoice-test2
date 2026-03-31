import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import prisma from "@/lib/prisma";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events (payment completed, subscription updates).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "PAID",
            paidAt: new Date(),
            paidAmount: session.amount_total ? session.amount_total / 100 : null,
          },
        });
      }
      break;
    }

    case "payment_link.created": {
      // No-op; tracked at creation time
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.user.updateMany({
        where: { stripeSubId: subscription.id },
        data: { plan: "FREE", stripeSubId: null },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price?.id;
      const isPro =
        priceId === process.env.STRIPE_PRO_PRICE_ID ||
        priceId === process.env.STRIPE_TEAM_PRICE_ID;

      if (isPro) {
        await prisma.user.updateMany({
          where: { stripeSubId: subscription.id },
          data: { plan: subscription.metadata?.plan === "TEAM" ? "TEAM" : "PRO" },
        });
      }
      break;
    }

    default:
      // Unhandled event type — not an error
      break;
  }

  return NextResponse.json({ received: true });
}
