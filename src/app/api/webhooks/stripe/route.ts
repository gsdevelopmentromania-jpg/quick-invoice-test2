import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import prisma from "@/lib/prisma";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events.
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
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const invoiceId = intent.metadata?.invoiceId;

      if (invoiceId) {
        await prisma.$transaction(async (tx) => {
          const inv = await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              status: "PAID",
              paidAt: new Date(),
              stripePaymentIntentId: intent.id,
            },
          });

          await tx.payment.create({
            data: {
              invoiceId,
              stripePaymentIntentId: intent.id,
              amount: intent.amount_received,
              currency: intent.currency,
              status: "SUCCEEDED",
              paidAt: new Date(),
            },
          });

          await tx.invoiceActivity.create({
            data: { invoiceId: inv.id, type: "PAID", metadata: { intentId: intent.id } },
          });
        });
      }
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      if (invoiceId) {
        await prisma.$transaction(async (tx) => {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              status: "PAID",
              paidAt: new Date(),
              ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
            },
          });

          if (paymentIntentId && session.amount_total) {
            await tx.payment.create({
              data: {
                invoiceId,
                stripePaymentIntentId: paymentIntentId,
                amount: session.amount_total,
                currency: session.currency ?? "usd",
                status: "SUCCEEDED",
                paidAt: new Date(),
              },
            });
          }

          await tx.invoiceActivity.create({
            data: { invoiceId, type: "PAID" },
          });
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;

      if (customerId) {
        const priceId = sub.items.data[0]?.price?.id;
        const plan =
          priceId === process.env.STRIPE_TEAM_PRICE_ID
            ? "TEAM"
            : priceId === process.env.STRIPE_PRO_PRICE_ID
            ? "PRO"
            : "FREE";

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (!user) return;

          await tx.user.update({
            where: { id: user.id },
            data: { plan },
          });

          await tx.subscription.upsert({
            where: { stripeSubscriptionId: sub.id },
            update: {
              status: sub.status.toUpperCase() as Parameters<
                typeof tx.subscription.update
              >[0]["data"]["status"],
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            create: {
              userId: user.id,
              stripeSubscriptionId: sub.id,
              stripePriceId: priceId ?? "",
              plan,
              status: sub.status.toUpperCase() as Parameters<
                typeof tx.subscription.create
              >[0]["data"]["status"],
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      await prisma.$transaction(async (tx) => {
        const subscription = await tx.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });

        if (!subscription) return;

        await tx.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "CANCELLED" },
        });

        await tx.user.update({
          where: { id: subscription.userId },
          data: { plan: "FREE" },
        });
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
