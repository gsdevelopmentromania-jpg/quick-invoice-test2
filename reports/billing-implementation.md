# Billing & Subscriptions — Implementation Report

**Project:** Quick Invoice Test 2
**Date:** 2026-04-01
**Phase:** Auth & Billing · Step 2

---

## Overview

Full Stripe billing integration for Quick Invoice's three-tier SaaS model (Free → Pro → Enterprise).
Covers subscription lifecycle, trial periods, usage enforcement, and billing UI.

---

## 1. Pricing Tiers

Defined in `src/lib/billing.ts` as `PLAN_CONFIGS`:

| Plan       | Price      | Invoices/mo | Clients | Trial  |
|------------|------------|-------------|---------|--------|
| Free       | $0         | 3           | 5       | None   |
| Pro        | $12/mo     | Unlimited   | ∞       | 14 days|
| Enterprise | $29/mo     | Unlimited   | ∞       | 14 days|

Annual pricing: Pro $99/yr (save 31%), Enterprise $249/yr (save 28%).

---

## 2. Stripe Integration

### Checkout (`POST /api/billing/checkout`)
- Creates a Stripe Checkout Session for PRO or TEAM plans
- Supports `withTrial: true` (default) — sets `payment_method_collection: "if_required"` so no card is required during trial
- Returns the checkout URL for client redirect
- `allow_promotion_codes: true` for discount codes

### Customer Portal (`POST /api/billing/portal`)
- Creates a Stripe Billing Portal session for customers to manage payment methods, view invoices, and download receipts
- Returns redirect URL; requires `stripeCustomerId` on the user record

### Customer Management (`getOrCreateStripeCustomer`)
- Lazily creates a Stripe customer on first checkout
- Persists `stripeCustomerId` to the `users` table for future use

---

## 3. Subscription Management

### Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/billing/subscription` | GET | Current plan, status, usage |
| `/api/billing/checkout` | POST | Start new subscription (Stripe Checkout) |
| `/api/billing/cancel` | POST | Cancel at period end |
| `/api/billing/reactivate` | POST | Undo pending cancellation |
| `/api/billing/upgrade` | POST | Change plan mid-cycle (new) |
| `/api/billing/portal` | POST | Open Stripe Customer Portal |

### Upgrade / Downgrade (`POST /api/billing/upgrade`)
- Changes subscription price in-place using `stripe.subscriptions.update`
- Uses `proration_behavior: "create_prorations"` — billing is adjusted proportionally
- Validates: target plan ≠ current plan, active subscription exists
- The `customer.subscription.updated` webhook syncs the new plan to the DB automatically

### Cancel (`POST /api/billing/cancel`)
- Sets `cancel_at_period_end: true` — user retains access until current period ends
- Does **not** immediately revoke access

### Reactivate (`POST /api/billing/reactivate`)
- Clears `cancel_at_period_end` — subscription continues normally

---

## 4. Trial Period

- 14-day free trial on Pro and Enterprise plans
- **No credit card required** — implemented via `payment_method_collection: "if_required"`
- `withTrial: false` overrides to require payment immediately
- Trial status tracked via `SubscriptionStatus.TRIALING` in the DB
- Webhook `customer.subscription.trial_will_end` fires 3 days before trial ends (TODO: send email)

---

## 5. Usage Limits & Feature Gates

Enforced server-side in `src/lib/billing.ts`:

| Function | Gate |
|----------|------|
| `canCreateInvoice(userId, plan)` | Counts invoices this calendar month vs. limit |
| `canCreateClient(userId, plan)` | Counts total active clients vs. limit |
| `canDownloadPDF(plan)` | Pro/Enterprise only |
| `canUseCustomBranding(plan)` | Pro/Enterprise only |
| `canSendReminders(plan)` | Pro/Enterprise only |

Called at the API boundary — Free users hitting limits get a `403 Forbidden` with a clear upgrade message.

---

## 6. Webhook Handling (`POST /api/webhooks/stripe`)

All events verified with `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`.

| Event | Handler |
|-------|---------|
| `payment_intent.succeeded` | Mark invoice PAID, create Payment record |
| `checkout.session.completed` | Mark invoice PAID (non-subscription flows) |
| `customer.subscription.created` | Upsert subscription, update user plan |
| `customer.subscription.updated` | Upsert subscription, sync plan changes |
| `customer.subscription.deleted` | Mark CANCELLED, downgrade user to FREE |
| `invoice.paid` | Re-sync subscription (clears PAST_DUE → ACTIVE) |
| `invoice.payment_failed` | Mark subscription PAST_DUE |
| `customer.subscription.trial_will_end` | Logged (email TODO) |

Webhook returns HTTP 200 even for non-transient errors to prevent Stripe retries.

---

## 7. Billing UI

### Pricing Page (`/pricing`)
Static server component showing all three plans with highlights.
- Free → links to `/register`
- Pro / Enterprise → links to `/register?plan=PRO|TEAM`
- Annual pricing savings calculated and displayed

### Settings → Billing Tab (`/settings`)
Fully dynamic client component:
- **Loading state**: skeleton placeholders while fetching
- **Current plan card**: shows plan name, status badges (Trial / Active / Past Due / Cancelling), next billing date, usage bars
- **Usage bars**: invoices this month and active clients vs. limits (turns red at limit)
- **Action buttons**: Cancel Plan / Keep Plan (reactivate) / Billing Portal
- **Upgrade cards** (FREE users): Pro and Enterprise cards with trial CTAs
- **Plan change** (paid users): PRO → Enterprise upgrade card or TEAM → Pro downgrade card

---

## 8. Data Model

Relevant Prisma models:

- **`User`**: `stripeCustomerId`, `plan` (enum: FREE/PRO/TEAM), `planExpiresAt`
- **`Subscription`**: `stripeSubscriptionId`, `stripePriceId`, `plan`, `status`, `currentPeriodStart/End`, `cancelAtPeriodEnd`
- **`SubscriptionStatus`**: ACTIVE, TRIALING, PAST_DUE, CANCELLED, UNPAID

---

## 9. Environment Variables

Required in `.env`:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 10. Tests

Test file: `src/__tests__/api/billing.test.ts`

Covers the full lifecycle:

| Scenario | Tests |
|----------|-------|
| Free user fetches subscription (no sub) | ✓ Returns FREE plan + usage |
| Trial subscription status | ✓ Returns TRIALING + trialEnd |
| Checkout — unauthenticated | ✓ 401 |
| Checkout — FREE plan rejected | ✓ 400 |
| Checkout — PRO with trial (no card) | ✓ payment_method_collection=if_required |
| Checkout — creates new Stripe customer | ✓ stripe.customers.create called |
| Cancel — no subscription | ✓ 400 |
| Cancel — sets cancel_at_period_end | ✓ |
| Reactivate — not pending cancel | ✓ 400 |
| Reactivate — clears cancellation | ✓ |
| Portal — no Stripe customer | ✓ 400 |
| Portal — returns URL | ✓ |
| Upgrade — no subscription | ✓ 400 |
| Upgrade — already on plan | ✓ 400 |
| Upgrade PRO → TEAM | ✓ proration_behavior=create_prorations |
| Downgrade TEAM → PRO | ✓ correct price ID sent |

---

## Files Written / Modified

| File | Status |
|------|--------|
| `src/lib/stripe.ts` | Existing |
| `src/lib/billing.ts` | Existing — plan configs, feature gates |
| `src/lib/dal/billing.ts` | Existing — getActiveSubscription |
| `src/app/api/billing/checkout/route.ts` | Existing |
| `src/app/api/billing/cancel/route.ts` | Existing |
| `src/app/api/billing/reactivate/route.ts` | Existing |
| `src/app/api/billing/portal/route.ts` | Existing |
| `src/app/api/billing/subscription/route.ts` | Existing |
| `src/app/api/billing/upgrade/route.ts` | **NEW** |
| `src/app/api/webhooks/stripe/route.ts` | Existing |
| `src/app/pricing/page.tsx` | Existing |
| `src/app/(dashboard)/settings/page.tsx` | **Updated** — dynamic BillingTab |
| `src/__tests__/api/billing.test.ts` | **NEW** |
