# Billing & Subscriptions — Implementation Report

**Project:** Quick Invoice Test 2
**Date:** 2026-04-01
**Phase:** Auth & Billing — Step 2

---

## Overview

Full Stripe billing integration with three plan tiers, checkout sessions, subscription lifecycle management, webhook handling, feature gates, and billing UI.

---

## Plan Tiers

| Plan       | Price       | Invoices/mo | Clients | PDF | Branding | Trial |
|------------|-------------|-------------|---------|-----|----------|-------|
| Free       | $0          | 3           | 5       | No  | No       | None  |
| Pro        | $12/mo      | Unlimited   | Unlimited | Yes | Yes    | 14 days |
| Enterprise | $29/mo      | Unlimited   | Unlimited | Yes | Yes    | 14 days |

Annual pricing: Pro $99/yr, Enterprise $249/yr.

---

## Files Created / Modified

### Core Library

**`src/lib/plans.ts`** (new)
- `PLAN_CONFIGS` — canonical plan metadata (limits, features, pricing, highlights)
- `getPlanConfig(plan)` — look up plan config

**`src/lib/billing.ts`** (new)
- Re-exports `PLAN_CONFIGS`, `getPlanConfig` from `@/lib/plans`
- `getStripePriceId(plan)` — server-side Stripe price ID resolver
- `planFromPriceId(priceId)` — reverse-map price ID to Plan enum
- `canCreateInvoice(userId, plan)` — DB-backed gate for monthly invoice limit
- `canCreateClient(userId, plan)` — DB-backed gate for client count limit
- `canDownloadPDF(plan)`, `canUseCustomBranding(plan)`, `canSendReminders(plan)` — sync feature gates
- `getUserUsage(userId)` — returns invoicesThisMonth, totalClients
- `getOrCreateStripeCustomer(userId, email, name)` — idempotent Stripe customer provisioning

**`src/lib/dal/billing.ts`** (new)
- `getActiveSubscription(userId)` — finds most recent ACTIVE / TRIALING / PAST_DUE subscription
- `getAllSubscriptions(userId)` — full history
- `getSubscriptionByStripeId(stripeSubscriptionId)` — lookup by Stripe ID

**`src/lib/dal/index.ts`** (updated)
- Added `export * from "./billing"` to expose billing DAL via barrel import

### API Routes

**`src/app/api/billing/checkout/route.ts`** (new)
- POST /api/billing/checkout
- Body: { plan: "PRO" | "TEAM", withTrial?: boolean, successUrl?, cancelUrl? }
- Creates a Stripe Checkout Session in subscription mode
- With withTrial: true (default): 14-day trial + payment_method_collection: "if_required"
- Returns { data: { url: string } }

**`src/app/api/billing/portal/route.ts`** (new)
- POST /api/billing/portal
- Creates a Stripe Customer Portal session
- Returns { data: { url: string } }

**`src/app/api/billing/subscription/route.ts`** (new)
- GET /api/billing/subscription
- Returns current plan, status, trial end, period end, cancel flag, usage stats
- Response type exported as SubscriptionDetails

**`src/app/api/billing/cancel/route.ts`** (new)
- POST /api/billing/cancel
- Sets cancel_at_period_end: true on the Stripe subscription

**`src/app/api/billing/reactivate/route.ts`** (new)
- POST /api/billing/reactivate
- Removes pending cancellation (cancel_at_period_end: false)

**`src/app/api/invoices/route.ts`** (updated)
- POST handler now enforces `canCreateInvoice(userId, plan)` gate
- Returns HTTP 403 with upgrade prompt when monthly limit is exceeded

**`src/app/api/clients/route.ts`** (updated)
- POST handler now enforces `canCreateClient(userId, plan)` gate
- Returns HTTP 403 with upgrade prompt when client limit is exceeded

**`src/app/api/invoices/[id]/pdf/route.ts`** (updated)
- GET handler now fetches `user.plan` and enforces `canDownloadPDF(plan)` gate
- Returns HTTP 403 with upgrade prompt for Free plan users

### Webhook Handler

**`src/app/api/webhooks/stripe/route.ts`** (new)

Handles events:
- `payment_intent.succeeded` — marks invoice PAID, creates Payment record, logs activity
- `checkout.session.completed` — marks invoice PAID from one-time checkout
- `customer.subscription.created` / `updated` — upserts Subscription row, syncs user.plan
- `customer.subscription.deleted` — sets status CANCELLED, resets user.plan to FREE
- `invoice.paid` — re-syncs subscription (handles past-due recovery)
- `invoice.payment_failed` — marks subscription PAST_DUE
- `customer.subscription.trial_will_end` — logs trial end (hook for email notification)

All subscription mutations use `upsertSubscription(sub)` helper for consistent plan resolution.

### UI

**`src/app/pricing/page.tsx`** (new)
- Public marketing pricing page at /pricing
- Three-column layout: Free, Pro (highlighted), Enterprise
- CTAs link to /register?plan=PRO and /register?plan=TEAM
- Displays annual savings percentages, no-card messaging

**`src/app/(dashboard)/settings/page.tsx`** (updated)
- BillingTab fetches real data from /api/billing/subscription
- Shows current plan, trial status, period end, cancel-scheduled and past-due warnings
- UsageBar component with color-coded progress (green/yellow/red)
- Functional Upgrade / Manage Billing / Cancel Plan / Reactivate buttons

### Tests

**`src/__tests__/api/billing.test.ts`** (new)
- 15 test cases across subscription GET, checkout POST, cancel POST, reactivate POST, PLAN_CONFIGS
- Mocks: next-auth, Prisma, Stripe
- Covers auth guards, invalid input, happy paths, edge cases

---

## Subscription Flow

```
Sign up (free)
  -> Click "Start 14-day trial"
  -> POST /api/billing/checkout -> Stripe Checkout (card optional)
  -> Webhook: customer.subscription.created (status: trialing)
     -> DB: user.plan = PRO, subscription.status = TRIALING
  -> Trial active (full Pro access, feature gates lifted)
  -> Trial ends -> Stripe collects payment
     -> invoice.paid -> subscription ACTIVE
     -> invoice.payment_failed -> subscription PAST_DUE
        -> User sees warning banner -> /api/billing/portal
  -> Active subscription
     -> Upgrade/Downgrade via /api/billing/portal (Stripe manages proration)
     -> Cancel via POST /api/billing/cancel (cancel_at_period_end: true)
     -> Reactivate via POST /api/billing/reactivate (cancel_at_period_end: false)
     -> Deleted -> customer.subscription.deleted -> user.plan = FREE
```

---

## Feature Gates — Enforcement Points

| Gate | Route | HTTP status on violation |
|------|-------|--------------------------|
| Monthly invoice limit | POST /api/invoices | 403 |
| Client count limit | POST /api/clients | 403 |
| PDF downloads | GET /api/invoices/[id]/pdf | 403 |
| Custom branding | (settings UI) | N/A |
| Payment reminders | POST /api/invoices/[id]/reminder | 403 (to add) |

---

## Environment Variables Required

```
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...     (12/month recurring)
STRIPE_TEAM_PRICE_ID=price_...    (29/month recurring)
```

---

## Risks and Mitigations

- **Webhook delivery failure**: Stripe auto-retries; handler returns 200 on non-transient errors.
- **Race on subscription upsert**: Prisma upsert on unique `stripeSubscriptionId` is atomic.
- **Stale plan in JWT**: Plan re-fetched from DB on each privileged action (not cached in session).
- **Card-not-required trial abuse**: Trial is per Stripe customer; email uniqueness enforced at registration.
- **Webhook signature bypass**: `stripe.webhooks.constructEvent` validates HMAC-SHA256 before processing.
- **Feature gate bypass**: Gates run server-side only; client UI is decorative, gates enforce on API.
