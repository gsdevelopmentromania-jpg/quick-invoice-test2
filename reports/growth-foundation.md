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

### Philosophy
Consistency beats volume for a new blog. Two posts per week is sustainable and builds topical authority faster than sporadic bursts. Social posts amplify each article for 3 days post-publish. Every piece of content maps to a keyword from the SEO pipeline and a funnel stage.

**Content mix per week:**
- 2 blog articles (1 informational / 1 commercial or comparison)
- 3 Twitter/X posts (1 article amplification, 1 tip, 1 build-in-public update)
- 2 LinkedIn posts (article shares, adapted for professional tone)
- 1 Reddit post (genuinely helpful, soft product mention — r/freelance, r/webdev, or r/digitalnomad)

---

### Week 1 (April 7–11, 2026) — Foundation

| Day | Format | Title / Topic | Target Keyword | Funnel Stage |
|-----|--------|---------------|---------------|--------------|
| Mon Apr 7 | Blog (informational) | **FreshBooks vs Quick Invoice: Which Is Better for Freelancers in 2026?** | `freshbooks alternative` | MOFU |
| Mon Apr 7 | Twitter/X | Thread: "I compared 7 freelance invoicing tools so you don't have to. Here's what I found 🧵" | — | Awareness |
| Tue Apr 8 | LinkedIn | Share: FreshBooks vs Quick Invoice article with professional framing | — | MOFU |
| Wed Apr 9 | Blog (informational) | **Free Invoice Template for Freelancers: Download, Customize, Send** | `free invoice template for freelancers` | TOFU |
| Wed Apr 9 | Twitter/X | "The invoice template I wish I'd had in year 1 of freelancing [free download]" | — | Awareness |
| Thu Apr 10 | LinkedIn | Share: invoice template article | — | TOFU |
| Thu Apr 10 | Reddit (r/freelance) | "I made a free invoice template that includes payment terms — here's why that matters" | — | TOFU |
| Fri Apr 11 | Twitter/X | Build-in-public: "Week 1 metrics: X visitors, Y signups. Here's what's working." | — | Community |

---

### Week 2 (April 14–18, 2026) — Education

| Day | Format | Title / Topic | Target Keyword | Funnel Stage |
|-----|--------|---------------|---------------|--------------|
| Mon Apr 14 | Blog (informational) | **How to Send an Invoice via Stripe Without Being a Developer** | `stripe invoicing for freelancers` | MOFU |
| Mon Apr 14 | Twitter/X | "Stripe invoicing in 3 steps — no developer required. Here's the exact flow 👇" | — | Awareness |
| Tue Apr 15 | LinkedIn | Share: Stripe invoicing article | — | MOFU |
| Wed Apr 16 | Blog (informational) | **How to Get Paid Faster as a Freelancer: 8 Proven Tactics** | `how to get paid faster as a freelancer` | TOFU |
| Wed Apr 16 | Twitter/X | "8 ways to cut your average payment time by 50% — freelancer edition 🧵" | — | Awareness |
| Thu Apr 17 | LinkedIn | Share: get paid faster article | — | TOFU |
| Thu Apr 17 | Reddit (r/webdev) | "After 200+ client invoices, here are the payment terms that actually work" | — | TOFU |
| Fri Apr 18 | Twitter/X | Product tip: "Did you know Quick Invoice embeds a Stripe payment link directly in your PDF? Zero extra steps." | — | BOFU |

---

### Week 3 (April 21–25, 2026) — SEO Depth

| Day | Format | Title / Topic | Target Keyword | Funnel Stage |
|-----|--------|---------------|---------------|--------------|
| Mon Apr 21 | Blog (informational) | **What Is Net 30? Payment Terms Explained for Freelancers** | `net 30 payment terms` | TOFU |
| Mon Apr 21 | Twitter/X | "Net 30 means your client has 30 days to pay. Here's what freelancers need to know before agreeing to it." | — | Awareness |
| Tue Apr 22 | LinkedIn | Share: net 30 article | — | TOFU |
| Wed Apr 23 | Blog (commercial) | **Best Invoice Apps for Freelancers in 2026: Ranked and Reviewed** | `best invoicing app for freelancers` | MOFU |
| Wed Apr 23 | Twitter/X | "I tested 7 invoice apps as a freelancer. Here's my honest ranking 🧵" | — | Awareness |
| Thu Apr 24 | LinkedIn | Share: best invoice apps article | — | MOFU |
| Thu Apr 24 | Reddit (r/digitalnomad) | "What invoicing tools are people actually using in 2026?" (community question + contribution) | — | Community |
| Fri Apr 25 | Twitter/X | Build-in-public: "Week 3 update: activation rate hit X%. Here's the one change that moved it." | — | Community |

---

### Week 4 (April 28 – May 2, 2026) — Authority & Conversion

| Day | Format | Title / Topic | Target Keyword | Funnel Stage |
|-----|--------|---------------|---------------|--------------|
| Mon Apr 28 | Blog (informational) | **How to Write a Professional Invoice: Fields, Format & Mistakes to Avoid** | `how to write a professional invoice` | TOFU |
| Mon Apr 28 | Twitter/X | "Your invoice is a document your client will judge you by. Here's how to make it look professional 🧵" | — | Awareness |
| Tue Apr 29 | LinkedIn | Share: professional invoice article | — | TOFU |
| Wed Apr 30 | Blog (pillar) | **The Complete Freelance Invoicing Guide 2026: From First Invoice to Getting Paid** | `freelance invoicing guide` | TOFU/MOFU |
| Wed Apr 30 | Twitter/X | "The most comprehensive freelance invoicing guide I've written — covers everything from templates to payment terms to Stripe setup." | — | TOFU |
| Thu May 1 | LinkedIn | Share: pillar guide with carousel-style text summary | — | TOFU |
| Thu May 1 | Reddit (r/freelance) | Share pillar guide as resource answer in an existing thread | — | TOFU |
| Fri May 2 | Twitter/X | "Month 1 wrapped. Here are the numbers: visitors / signups / MRR / biggest learning. 🧵" | — | Community |

---

### Content Production SLA

| Role | Responsibility | Deadline |
|------|---------------|----------|
| Content Writer | Draft delivered | 5 days before publish date |
| SEO Specialist | Keyword brief + on-page review | 3 days before publish date |
| Marketing Manager (Echo) | Final approval + scheduling | 1 day before publish date |
| Developer | MDX file added to `src/app/blog/` + registry update in `src/lib/blog.ts` | Publish day morning |

---

## 5. SEO Content Pipeline

### Strategy
Focus on long-tail informational keywords with low-to-medium competition. At domain authority 0–10 (new site), high-volume head terms (e.g., "invoice generator" — 40K+/mo) are not winnable. Long-tail keywords with 500–5,000 searches/month and clear informational intent are attainable within 90 days of consistent publishing.

**Topical cluster:** All 10 articles reinforce the pillar topic of "freelance invoicing," building topical authority that helps the pillar page rank for broader terms over time.

---

### 10 Article Topics — Long-Tail SEO Pipeline

| # | Article Title | Target Long-Tail Keyword | Est. Volume | Difficulty | Funnel | Priority |
|---|--------------|--------------------------|-------------|------------|--------|----------|
| 1 | **FreshBooks vs Quick Invoice: Which Is Better for Freelancers in 2026?** | `freshbooks alternative for freelancers` | 2,400/mo | Low | MOFU | 🔴 P1 |
| 2 | **Free Invoice Template for Freelancers (Word, Google Docs & PDF)** | `free invoice template for freelancers` | 6,600/mo | Medium | TOFU | 🔴 P1 |
| 3 | **How to Send an Invoice via Stripe Without Being a Developer** | `stripe invoicing for freelancers` | 880/mo | Low | MOFU | 🔴 P1 |
| 4 | **How to Get Paid Faster as a Freelancer: 8 Proven Tactics** | `how to get paid faster freelancer` | 2,400/mo | Low | TOFU | 🔴 P1 |
| 5 | **What Is Net 30? Payment Terms Explained for Freelancers** | `net 30 payment terms freelancer` | 4,400/mo | Low | TOFU | 🟡 P2 |
| 6 | **Best Invoice Apps for Freelancers in 2026: Ranked and Reviewed** | `best invoicing app for freelancers 2026` | 2,900/mo | Low–Medium | MOFU | 🔴 P1 |
| 7 | **How to Write a Professional Invoice: Fields, Format & Mistakes to Avoid** | `how to write a professional invoice` | 1,600/mo | Low | TOFU | 🟡 P2 |
| 8 | **Late Invoice? How to Follow Up on Unpaid Invoices Without Being Awkward** | `how to follow up on unpaid invoice` | 1,900/mo | Low | TOFU | 🟡 P2 |
| 9 | **Invoice vs Receipt: What's the Difference and When to Use Each** | `invoice vs receipt difference` | 3,600/mo | Low | TOFU | 🟢 P3 |
| 10 | **Wave Invoice vs Quick Invoice: The Honest Comparison for Freelancers** | `wave invoice alternative` | 1,900/mo | Low | MOFU | 🟡 P2 |

---

### Content Briefs — Quick Summary

**Article 1 — FreshBooks Alternative**
- Angle: "FreshBooks is great but overkill and overpriced for solo freelancers"  
- Structure: Price comparison table, feature comparison, verdict, CTA to try Quick Invoice  
- Internal link: Point to `/pricing` and pillar article  
- Expected: Ranks within 60–90 days; drives high-intent signups

**Article 3 — Stripe Invoicing**
- Angle: Step-by-step tutorial showing the Quick Invoice + Stripe flow  
- Screenshots: Invoice creation → Stripe payment link embed → client pay page  
- Note: This is essentially a product walkthrough — highest direct conversion potential

**Article 6 — Best Invoice Apps Roundup**
- Angle: Honest comparison; don't make it feel like an ad  
- Include competitors fairly; win on simplicity/price position  
- Structure: scoring table + per-tool summary paragraphs  
- Backlink opportunity: May attract links from roundup aggregators

**Article 8 — Late Invoice Follow-Up**
- Angle: Emotional pain point ("awkward to ask for money") → practical scripts  
- Include: 3 email templates for overdue invoice follow-up  
- CTA: "Quick Invoice sends automatic reminders so you never have to write these"  
- High-intent: users experiencing payment delays = active problem-solvers

---

### Publishing Cadence
- 2 articles/week (Mon + Wed)
- All articles go in `src/app/blog/[slug]/page.mdx`  
- Each article registered in `src/lib/blog.ts` on publish day
- Each new article submitted to Google Search Console "URL Inspection" for manual indexing

---

## 6. Automated Email Sequences

### Infrastructure
Email delivery is handled by the existing `src/lib/email.ts` module. The sequences below define the triggers, timing, subject lines, and body copy for each automated email.

---

### 6.1 Trial Expiry Sequence

Triggered when a user is on the free trial (< 14 days since signup) and has not upgraded to Pro. Three emails in the sequence.

---

#### Email T-3: Three Days Before Trial Expiry

**Trigger:** 11 days after signup (trial day 11 of 14), user has not upgraded  
**Send time:** 10:00 AM user local time  
**Subject:** `Your Quick Invoice trial ends in 3 days`  
**Preview text:** `Here's what you'll lose access to — and how to keep it.`

```
Hi [first_name],

Quick heads-up: your Quick Invoice trial ends in 3 days (on [expiry_date]).

After that, you'll lose access to:
• Sending new invoices
• Stripe payment collection
• PDF export for your invoices

Everything you've already created stays safe — your invoice history, client list, and PDFs are preserved.

To keep going without interruption, upgrade to Pro for $12/month.

[Keep my Quick Invoice — Upgrade to Pro]

If you have any questions before deciding, just reply to this email. I read every message.

— [Founder name]
Quick Invoice
```

---

#### Email T-1: One Day Before Trial Expiry

**Trigger:** 13 days after signup (trial day 13 of 14), user has not upgraded  
**Send time:** 10:00 AM user local time  
**Subject:** `Last day of your trial — one thing to consider`  
**Preview text:** `Don't lose your invoices tomorrow.`

```
Hi [first_name],

Your trial expires tomorrow.

I wanted to share one thing before you decide:

The average Quick Invoice user sends their first paid invoice within 48 hours of signing up. If you've already sent an invoice and a client has paid (or is about to), that's $[X] that came through a $12/mo tool.

That's the math most freelancers don't do upfront.

If Quick Invoice has been useful, here's the link to stay:

[Upgrade to Pro — $12/month]

No pressure either way. If the timing isn't right, just let it expire — you can reactivate anytime and your data will still be here.

— [Founder name]
```

---

#### Email T+0: Trial Expired

**Trigger:** 14 days after signup, user has not upgraded  
**Send time:** 10:00 AM user local time  
**Subject:** `Your Quick Invoice trial has ended`  
**Preview text:** `Your data is safe. Come back whenever you're ready.`

```
Hi [first_name],

Your free trial has ended and your account is now on the free plan (read-only access to existing invoices, no new invoice creation).

Your invoice history, client list, and PDFs are saved and waiting for you.

Whenever you're ready to start sending invoices again:

[Reactivate Pro — $12/month]

Still not sure? Here's a 2-minute demo of everything Quick Invoice does:
[Watch the demo]

Thanks for trying it out.

— [Founder name]
Quick Invoice
```

---

### 6.2 Onboarding Email Sequence (Days 0–7)

| Day | Subject | Goal |
|-----|---------|------|
| Day 0 (signup) | `Welcome to Quick Invoice — here's your first step` | Drive to create first invoice |
| Day 1 | `Quick question before you send your first invoice` | Acquisition survey (see Section 2.2) |
| Day 3 (if no invoice sent) | `Your client is waiting — send your first invoice in 2 minutes` | Re-engage non-activated users |
| Day 5 (if invoice sent) | `Nice! Your first invoice is out — here's what to do next` | Drive Stripe payment setup |
| Day 7 | `7 days in — how's Quick Invoice working for you?` | Early satisfaction pulse |

---

### 6.3 Retention Email (Day 30 — NPS)

**Trigger:** 30 days after signup, user has sent ≥3 invoices  
**Subject:** `How's Quick Invoice working for you?`

See Section 2.4 for full NPS survey copy.

---

### 6.4 Win-Back Email (60 Days Post-Churn)

**Trigger:** 60 days after cancellation, user has not reactivated  
**Subject:** `We've been building — here's what's new at Quick Invoice`

```
Hi [first_name],

It's been a couple months since you left Quick Invoice.

We've shipped a few things since then that might be relevant:

• [Feature 1 — e.g., recurring invoices]
• [Feature 2 — e.g., automatic payment reminders]
• [Feature 3 — e.g., custom invoice templates]

If any of those were on your wishlist, we'd love to have you back.

[Reactivate your account — first month 30% off with code BACK30]

— [Founder name]
```

---

## 7. Weekly Growth Report Template

Use this template every Monday morning. Takes ~20 minutes to complete. Share in team Slack channel `#growth`.

---

```markdown
# Weekly Growth Report — Week of [DATE]
**Prepared by:** [Name]  
**Reporting period:** [Mon DATE] – [Sun DATE]

---

## 🚦 Dashboard Summary

| Metric | This Week | Last Week | Δ | On Track? |
|--------|-----------|-----------|---|-----------|
| Weekly Visitors | | | | ✅ / ⚠️ / 🔴 |
| New Signups | | | | ✅ / ⚠️ / 🔴 |
| Activation Rate (signup → invoice sent ≤7d) | | | | ✅ / ⚠️ / 🔴 |
| Invoices Sent (North Star) | | | | ✅ / ⚠️ / 🔴 |
| New Paid Customers | | | | ✅ / ⚠️ / 🔴 |
| MRR | | | | ✅ / ⚠️ / 🔴 |
| Churned Customers | | | | ✅ / ⚠️ / 🔴 |
| Net MRR Change | | | | ✅ / ⚠️ / 🔴 |

---

## 📢 Acquisition

**Top traffic sources this week:**
1. [Source] — [sessions] sessions — [signup conversion %]
2. [Source] — [sessions] sessions — [signup conversion %]
3. [Source] — [sessions] sessions — [signup conversion %]

**Content published:**
- [Article title] — [pageviews] views — [signups attributed]
- [Article title] — [pageviews] views — [signups attributed]

**Social highlights:**
- Best performing post: [link + engagement stats]

---

## 🎯 Activation & Engagement

**Activation funnel (this week's signups):**
- Signed up: [N]
- Sent ≥1 invoice within 7 days: [N] ([%])
- Connected Stripe: [N] ([%])
- Sent invoice with payment link: [N] ([%])

**Product usage:**
- Total invoices sent: [N]
- Invoices paid via Stripe link: [N] ([%])

---

## 💰 Revenue

**MRR breakdown:**
- New MRR: $[X] ([N] new customers × avg $[Y]/mo)
- Expansion MRR: $[X] (upgrades)
- Churned MRR: -$[X] ([N] cancellations)
- **Net New MRR: $[X]**

**Trial pipeline:**
- Active trials: [N]
- Trials expiring this week: [N]
- Conversion rate (trials → paid, last 14 days): [%]

---

## 💬 Feedback & Support

**Feedback collected:**
- PMF survey responses: [N] — Very disappointed: [%]
- Post-signup survey top answer: [option]
- Churn survey this week: [N] cancellations — Top reason: [reason]

**Support tickets:**
- Volume: [N] tickets
- Top theme: [theme]
- Resolved: [N] / [N]

---

## ⚡ Wins This Week

1. [Win]
2. [Win]
3. [Win]

---

## 🔴 Problems / Blockers

1. [Problem + owner + ETA]
2. [Problem + owner + ETA]

---

## 📋 This Week's Priorities

| # | Priority | Owner | Done by |
|---|----------|-------|---------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## 📊 Cumulative Metrics (Running Total)

| Metric | All-Time Total |
|--------|---------------|
| Total Signups | |
| Total Paying Customers | |
| Total Invoices Sent | |
| Total Invoice Volume ($) | |
| MRR | |
| ARR (MRR × 12) | |

---
*Report generated: [DATE] · Next report: [DATE+7]*
```

---

## 8. Recurring Weekly Growth Review

### Cadence
**Every Monday, 9:00 AM** — Weekly Growth Review

### Recurring Task Definition

```
TASK: Weekly Growth Review — Quick Invoice
RECURRING: Every Monday
DURATION: 45 minutes
OWNER: Echo (Marketing Manager)

AGENDA:
1. (10 min) Fill in Weekly Growth Report template (Section 7)
2. (10 min) Review PostHog dashboard — funnel, cohorts, top pages
3. (5 min)  Review Stripe dashboard — MRR, new customers, churn
4. (5 min)  Review feedback inbox — PMF survey, post-signup replies, churn reasons
5. (10 min) Set top 3 priorities for the week (growth levers to pull)
6. (5 min)  Update content calendar — confirm this week's articles are on track

INPUTS REQUIRED:
- PostHog dashboard (visitors, activation funnel, invoice_sent events)
- Stripe Dashboard (MRR, new customers, churned subscriptions)
- Email inbox (post-signup survey replies, churn survey responses)
- Plausible analytics (traffic sources, top pages)
- Content Writer status update on articles in progress

OUTPUTS:
- Completed weekly growth report posted to #growth Slack channel
- Top 3 priorities documented
- Any blockers escalated to founder

FIRST REVIEW: Monday, April 7, 2026
```

---

## Appendix: Quick-Reference Benchmarks

| Metric | Early-Stage SaaS Benchmark | Quick Invoice Target |
|--------|---------------------------|---------------------|
| Visitor → Signup | 2–5% | ≥ 3% |
| Signup → Activated (≤7d) | 40–60% | ≥ 55% |
| Trial → Paid | 10–25% | ≥ 15% |
| Monthly Churn | 3–8% | < 5% |
| NPS (D30) | 20–40 | ≥ 30 |
| LTV:CAC | ≥ 3:1 | ≥ 3:1 |
| CAC (organic) | $10–$30 | < $20 |
| PMF score ("very disappointed") | ≥ 40% = PMF | Target ≥ 40% by D60 |

---

*Report authored by: Echo (Marketing Manager) · 2026-04-01*  
*Builds on: positioning.md (2026-03-31), seo-setup.md (2026-04-01)*  
*Coordinates with: Content Writer (blog articles), SEO Specialist (keyword briefs), Developer (referral system + feedback widget)*  
*Next review: 2026-04-07 (first weekly growth review)*
