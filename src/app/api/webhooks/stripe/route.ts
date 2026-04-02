import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { planFromPriceId } from "@/lib/billing";
import { sendTrialEndingEmail } from "@/lib/email";
import type { SubscriptionStatus, Plan } from "@prisma/client";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events.
 *
 * Handled events:
 *  - payment_intent.succeeded
 *  - checkout.session.completed
 *  - customer.subscription.created
 *  - customer.subscription.updated
 *  - customer.subscription.deleted
 *  - invoice.paid            (subscription billing cycle)
 *  - invoice.payment_failed  (failed subscription payment)
 *  - customer.subscription.trial_will_end
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

  try {
    switch (event.type) {
      // ── One-time invoice payments ───────────────────────────────────────

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
        // Subscription checkout completions are handled via customer.subscription.created
        break;
      }

      // ── Subscription lifecycle ──────────────────────────────────────────

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await prisma.$transaction(async (tx) => {
          const existing = await tx.subscription.findUnique({
            where: { stripeSubscriptionId: sub.id },
          });

          if (!existing) return;

          await tx.subscription.update({
            where: { stripeSubscriptionId: sub.id },
            data: { status: "CANCELLED" },
          });

          await tx.user.update({
            where: { id: existing.userId },
            data: { plan: "FREE" },
          });
        });
        break;
      }

      // ── Subscription billing cycle payments ────────────────────────────

      case "invoice.paid": {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof stripeInvoice.subscription === "string" ? stripeInvoice.subscription : null;

        if (subscriptionId) {
          // Re-sync subscription to pick up any status changes (e.g. was PAST_DUE, now ACTIVE)
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscription(stripeSub);
        }
        break;
      }

      case "invoice.payment_failed": {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof stripeInvoice.subscription === "string" ? stripeInvoice.subscription : null;

        if (subscriptionId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
          });

          const sub = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          });
          if (sub) {
            console.warn(
              `[webhook] Payment failed for subscription ${subscriptionId} (user: ${sub.userId})`
            );
          }
        }
        break;
      }

      // ── Trial ending soon ───────────────────────────────────────────────

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;

        console.info(
          `[webhook] Trial ending soon for subscription ${sub.id} at ${trialEnd?.toISOString() ?? "unknown"}`
        );

        if (trialEnd && customerId) {
          try {
            const user = await prisma.user.findFirst({
              where: { stripeCustomerId: customerId },
              select: { email: true, fullName: true },
            });

            if (user?.email) {
              await sendTrialEndingEmail({
                to: user.email,
                name: user.fullName ?? undefined,
                trialEndDate: trialEnd,
                upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/pricing`,
              });
            }
          } catch (emailErr) {
            console.error("[webhook] Failed to send trial-ending email:", emailErr);
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error processing event ${event.type}:`, err);
    // Return 200 to prevent Stripe from retrying non-transient errors
  }

  return NextResponse.json({ received: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : null;
  if (!customerId) return;

  const priceId = sub.items.data[0]?.price?.id ?? "";
  const plan: Plan = planFromPriceId(priceId);

  const statusMap: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELLED",
    unpaid: "UNPAID",
    trialing: "TRIALING",
  };
  const status: SubscriptionStatus = statusMap[sub.status] ?? "ACTIVE";

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
        stripePriceId: priceId,
        plan,
        status,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
      create: {
        userId: user.id,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan,
        status,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  });
}
