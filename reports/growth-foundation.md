# Growth Baseline & Automation — Quick Invoice
**Project:** Quick Invoice  
**Date:** 2026-04-01  
**Author:** Echo (Marketing Manager Agent)  
**Phase:** Go-to-Market · Step 2

> **Context:** Built on the Value Proposition & Positioning report (2026-03-31) and SEO & Analytics Foundation (2026-04-01). Targets the primary persona: solo digital freelancers (designers, developers, writers, consultants) billing 1–20 clients/month, priced at $12/mo Pro.

---

## Table of Contents
1. [Metrics Dashboard](#1-metrics-dashboard)
2. [Feedback Collection](#2-feedback-collection)
3. [Referral System](#3-referral-system)
4. [4-Week Content Calendar](#4-4-week-content-calendar)
5. [SEO Content Pipeline — 10 Article Topics](#5-seo-content-pipeline)
6. [Automated Email Sequences](#6-automated-email-sequences)
7. [Weekly Growth Report Template](#7-weekly-growth-report-template)
8. [Recurring Weekly Growth Review Task](#8-recurring-weekly-growth-review)

---

## 1. Metrics Dashboard

### Philosophy
Track the fewest metrics that force the best decisions. For an early-stage SaaS, five core metrics cover the full funnel from acquisition to revenue. Add secondary metrics only when you need to diagnose a specific problem in the funnel.

---

### 1.1 Core Metrics (North Star Dashboard)

| # | Metric | Definition | Target (Day 30) | Target (Day 90) | Data Source |
|---|--------|-----------|-----------------|-----------------|-------------|
| 1 | **Weekly Visitors** | Unique sessions to marketing site | 500/wk | 2,000/wk | PostHog / Plausible |
| 2 | **Signups** | New accounts created (email verified) | 25/wk | 100/wk | Auth DB + PostHog `signup` event |
| 3 | **Activation Rate** | % of signups who send ≥1 invoice within 7 days | ≥ 55% | ≥ 65% | PostHog `invoice_sent` funnel |
| 4 | **D30 Retention** | % of Week-1 signups still active in Week 4 | Measure only | ≥ 40% | PostHog cohort report |
| 5 | **MRR** | Sum of active paid subscriptions × monthly price | $0 → $100 | $500–$1,000 | Stripe Dashboard + billing DB |

**North Star Metric:** `Invoices Sent per Week` — captures activation, engagement, and product value in a single number. Growth in invoices sent is a leading indicator for MRR growth.

---

### 1.2 Secondary Metrics (Diagnostic Layer)

| Metric | Why It Matters | Benchmark |
|--------|---------------|-----------|
| **Visitor → Signup rate** | Marketing site conversion efficiency | ≥ 3–5% |
| **Signup → Paid conversion** | Trial-to-paid quality | ≥ 15% (90-day) |
| **Stripe payment link CTR** | Core differentiator adoption | ≥ 50% of sent invoices |
| **Paid invoice rate** | % of sent invoices marked paid | ≥ 70% |
| **CAC (Customer Acquisition Cost)** | Total marketing spend ÷ new paying customers | < $20 (organic focus) |
| **LTV (12-mo estimate)** | ARPU × avg months retained | ≥ $100 |
| **LTV:CAC ratio** | Minimum viable growth health | ≥ 3:1 |
| **Churn rate (monthly)** | % of paying customers who cancel | < 5%/mo |
| **Support ticket volume** | Product quality signal | Track themes weekly |
| **NPS (Net Promoter Score)** | Loyalty & word-of-mouth potential | ≥ 30 at D60 |

---

### 1.3 Dashboard Setup

**Primary Tool:** PostHog (already configured in `src/components/analytics/analytics.tsx`)

**Required PostHog Configuration:**

1. **Funnel:** `pageview (/)` → `signup` → `invoice_sent` → `upgrade`
2. **Cohort Retention:** Weekly cohorts on `signup` event, measuring `invoice_sent` return
3. **Custom Dashboard Panels:**
   - Line chart: `signup` events (daily, 30-day rolling)
   - Funnel chart: signup → activation (invoice_sent within 7 days)
   - Bar chart: `invoices_sent` by week
   - KPI card: MRR (pulled from Stripe webhook data)

**Secondary Tool:** Stripe Dashboard for MRR, churn, and subscription metrics. Export weekly to growth report.

**Plausible:** Traffic baseline (visitors, bounce rate, top pages). Privacy-compliant, no cookie banner needed for EU traffic.

---

### 1.4 Analytics Events Already Implemented

Per `src/lib/analytics.ts` — the following events are already firing and should be used as dashboard inputs:

| Event | Dashboard Use |
|-------|--------------|
| `signup` | Acquisition funnel entry |
| `trial_start` | Trial cohort tracking |
| `upgrade` | Conversion funnel exit (revenue) |
| `invoice_sent` | Activation + engagement |
| `invoice_paid` | Payment adoption rate |
| `checkout_started` | Pricing page intent signal |

**No additional tracking code required for the core dashboard.** Wire these events into PostHog funnels and cohort charts on Day 1.

---

## 2. Feedback Collection

### Philosophy
Collect feedback at three moments of truth: immediately post-signup (intent), mid-trial (experience), and at cancellation (regret). Keep each survey to ≤3 questions. Response rate drops sharply beyond that.

---

### 2.1 In-App Feedback Widget

**Trigger:** Show after user sends their 3rd invoice (proven activation signal — they've completed the core loop twice and have an informed opinion).

**Implementation:** Use a floating bottom-right widget (no modal — avoid blocking the workflow).

**Widget Copy:**

```
How would you feel if you could no longer use Quick Invoice?
○ Very disappointed
○ Somewhat disappointed  
○ Not disappointed (it's not that essential)

[Optional] What's the one thing we should improve?
[________________]

[Submit quietly]  [Skip]
```

> **Why this question?** This is the Sean Ellis PMF Survey. "Very disappointed" ≥ 40% = strong product-market fit signal. Track this weekly from Day 30 onward.

**Storage:** Write responses to a `feedback` table in your DB. Tag with: `user_id`, `invoice_count_at_time`, `created_at`, `response`, `comment`.

---

### 2.2 Post-Signup Survey (Day 1 Email)

Deliver via onboarding email sequence (see Section 6). Ask one question only:

**Subject line:** `Quick question before you send your first invoice`

**Body:**

```
Hey [first_name],

Before you dive in — one quick question:

What made you sign up for Quick Invoice today?

○ I'm switching from FreshBooks / Wave / another tool
○ I've been using Google Docs / Excel for invoices
○ A friend or colleague recommended it
○ I found you via search / a blog post
○ Just exploring options

Hit reply or click your answer above — takes 5 seconds.

— [Founder name]
Quick Invoice
```

> **Why this matters:** Acquisition channel attribution helps you double down on what's working before you have enough data for statistical significance. Manual email replies also build founder-user relationships that convert to loyal advocates.

---

### 2.3 Churn Survey

**Trigger:** When a user cancels their subscription (intercept on the cancel confirmation screen before the cancellation is processed).

**Format:** Single-select + optional text field. Shown in-product, not via email.

```
Before you go — what's the main reason you're cancelling?

○ I'm not freelancing anymore / work slowed down
○ It's too expensive for what I need
○ I found a better tool (which one? ________)
○ Missing a feature I need (what? ________)
○ I had trouble using it
○ I was just trying it out / never really needed it

[Cancel my subscription]   [Actually, keep my subscription]
```

**Retention offer:** If user selects "too expensive," show: *"Before you go — can we offer you 2 months free? [Yes, pause my billing]"* This is a pause offer, not a discount. Pauses preserve MRR.

**Storage:** Log cancellation reason alongside Stripe `customer.subscription.deleted` webhook data in `reports/churn-log.csv` (manually maintained weekly).

---

### 2.4 NPS Survey (Day 30 Email)

Send 30 days after signup to users who have sent ≥3 invoices.

**Subject:** `How's Quick Invoice working for you?`

**Survey:** Standard 0–10 NPS scale + one follow-up:

```
How likely are you to recommend Quick Invoice to a fellow freelancer?
[0 — 1 — 2 — 3 — 4 — 5 — 6 — 7 — 8 — 9 — 10]

What's the main reason for your score?
[________________]
```

**Segment responses:** Promoters (9–10) → ask for a tweet/testimonial. Passives (7–8) → ask what would make it a 10. Detractors (0–6) → founder reaches out personally.

---

## 3. Referral System

### Philosophy
For a solo freelancer tool, referrals work best when they're embedded in the product's natural sharing moments — not a separate "Invite friends" page. The invoice PDF itself is a distribution channel.

---

### 3.1 Referral Flow Design

**Trigger Points (in priority order):**

1. **PDF Footer** — Every invoice PDF includes a small footer: *"Invoiced with Quick Invoice · quickinvoice.app"*  
   - This is the highest-leverage channel. Every invoice sent = a brand impression to a client.  
   - The link goes to a landing page variant: `/referred` (tracks referral traffic from PDFs).

2. **Post-Payment Thank You Page** — After a client pays via Stripe, show: *"Quick Invoice makes it easy to send and get paid. Get 1 month free: [quickinvoice.app/ref/[user_handle]]"*  
   - This reaches the exact moment of client satisfaction — maximum openness to a new tool recommendation.

3. **In-App Invite Flow** — Dashboard sidebar: *"Know a freelancer? Give them 1 month free, get 1 month free."*

---

### 3.2 Incentive Structure

| Action | Referrer Reward | Referred User Reward |
|--------|----------------|---------------------|
| Friend signs up + sends first invoice | +1 month Pro free | First month 50% off |
| Friend upgrades to Pro | +1 month Pro free (stacked) | — |
| 5 successful referrals | Permanent 20% off Pro | — |

**Why this structure:**
- Reward only on activation (invoice sent), not just signup — prevents spam referrals
- Keep it simple: one month free is tangible and easy to communicate
- No cash/PayPal payouts (complexity, fraud risk) — product credit only
- Cap at 5 stacked months to limit liability while rewarding advocates

---

### 3.3 Technical Implementation Notes

**Referral tracking:**
- Generate unique `ref_code` per user on account creation (6-char alphanumeric, stored in `users` table)
- Referral URL: `quickinvoice.app/register?ref=[ref_code]`
- Cookie the `ref_code` for 30 days on landing (handles bookmark → later signup flows)
- Track in `referrals` table: `referrer_id`, `referred_user_id`, `status` (pending / activated / rewarded)

**PDF footer:**
- Add to `src/lib/pdf/invoice-pdf.tsx`: static footer text + URL (no personalized ref link in PDF — too complex, static brand URL is sufficient)

**Reward fulfillment:**
- On referral activation, call Stripe API to add a one-month credit to referrer's subscription: `stripe.customers.createBalanceTransaction`
- Send automated email to referrer: *"[name] just sent their first invoice! You've earned 1 month free."*

---

### 3.4 Referral Dashboard (User-Facing)

Add to `/settings` page:

```
Your referral link: quickinvoice.app/ref/[code]   [Copy]

Referrals: 0 signed up · 0 activated · 0 months earned

Share: [Twitter] [Copy link] [Email]
```

---

## 4. 4-Week Content Calendar
