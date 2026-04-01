# Growth Baseline & Automation — Quick Invoice Test 2

> Phase: Go-to-Market · Step 2 · Generated: 2026-04-01

---

## Overview

This document establishes the complete growth foundation for Quick Invoice — a focused invoicing tool for solo freelancers. It covers the metrics infrastructure, feedback systems, referral mechanics, content calendar, SEO pipeline, automated email sequences, and the weekly growth review cadence.

**Positioning recap:** Quick Invoice helps freelancers create, send, and collect payment on a professional invoice in under two minutes — no bloated accounting suite, no team seats, no complexity. (See `reports/positioning.md` for full positioning framework.)

---

## 1. Metrics Dashboard

### North Star Metric
**Invoices Sent per Week** — reflects core product value (getting paid), correlates with activation, retention, and revenue.

### Dashboard Stack
| Tool | Purpose | Cost |
|------|---------|------|
| **PostHog** (self-hosted or cloud) | Product analytics — funnels, cohorts, session recordings | Free (self-hosted) / $0–$450/mo cloud |
| **Plausible Analytics** | Privacy-friendly web traffic — visitors, referrers, top pages | $9/mo |
| **Stripe Dashboard** | MRR, new customers, churn, revenue trends | Included with Stripe |
| **Custom `/admin/metrics` page** | Internal snapshot view pulling PostHog + Stripe APIs | Dev effort: ~4h |

### Metrics to Track (by category)

#### Acquisition
| Metric | Definition | Target (D30) |
|--------|-----------|-------------|
| Weekly Visitors | Unique visitors from Plausible | Grow MoM |
| Visitor → Signup Rate | Signups / Visitors | ≥ 3% |
| Signup Source Breakdown | % by channel (organic, social, referral, direct) | Track only |
| CAC | Total marketing spend / new paid customers | < $20 |

#### Activation
| Metric | Definition | Target (D30) |
|--------|-----------|-------------|
| Activation Rate | % of signups who send ≥1 invoice within 7 days | ≥ 55% |
| Stripe Connection Rate | % of signups who connect Stripe | ≥ 40% |
| Time to First Invoice | Median minutes from signup → first invoice sent | < 10 min |

#### Retention
| Metric | Definition | Target (D60) |
|--------|-----------|-------------|
| D7 Retention | % of users active 7 days after signup | ≥ 60% |
| D30 Retention | % of users active 30 days after signup | ≥ 45% |
| Invoices/User/Month | Avg monthly invoice volume per active user | ≥ 3 |
| Monthly Churn Rate | % of paying users who cancel per month | < 5% |

#### Revenue
| Metric | Definition | Target (D90) |
|--------|-----------|-------------|
| MRR | Monthly Recurring Revenue | $500–$1,000 |
| New MRR | MRR from new customers this month | Track weekly |
| Churned MRR | MRR lost to cancellations | Track weekly |
| Trial → Paid Rate | % of trial users who upgrade | ≥ 15% |
| LTV (projected 12mo) | Avg revenue per customer × 12-mo retention | ≥ $100 |
| LTV:CAC Ratio | LTV / CAC | ≥ 3:1 |

### PostHog Event Taxonomy
Define these custom events in PostHog at launch:

```
invoice_created       — user creates a new invoice (draft saved)
invoice_sent          — user sends invoice to client (email dispatched)
invoice_paid          — invoice status set to "paid" (Stripe webhook or manual)
stripe_connected      — user completes Stripe OAuth
pdf_downloaded        — user downloads invoice PDF
payment_link_clicked  — client clicks embedded payment link
trial_expired         — 14-day trial period ends without upgrade
subscription_started  — user upgrades to Pro
subscription_cancelled — user cancels Pro
```

Each event should capture: `user_id`, `plan`, `invoice_count` (running total), `days_since_signup`.

---

## 2. Feedback Collection

### 2.1 In-App Feedback Widget

**Tool:** [Canny](https://canny.io) (free tier) or a lightweight custom modal.

**Placement:**
- Bottom-right corner of the dashboard — persistent but unobtrusive
- Triggered automatically after a user's 3rd invoice sent (high-engagement moment)
- One-click access via the sidebar ("Feedback" link)

**Widget prompt:**
> "Quick Invoice is built for freelancers like you. What's one thing that would make it better?"

**Response handling:**
- Responses tagged by theme (UI, payments, reminders, templates, mobile)
- Reviewed weekly in the Monday growth review
- Top themes feed directly into the v1.1 roadmap

---

### 2.2 Post-Signup Survey (Day 1 Email)

Sent automatically 24 hours after signup via the onboarding email sequence (see Section 6). Typeform or a simple HTML form embedded in the email.

**Survey questions:**

1. **How did you hear about Quick Invoice?**
   - [ ] Google search
   - [ ] Twitter / X
   - [ ] Reddit
   - [ ] Friend/colleague recommendation
   - [ ] Blog post / article
   - [ ] Other: ___

2. **What's your primary reason for trying Quick Invoice?**
   - [ ] I need to send my first invoice
   - [ ] My current invoicing tool is too complicated
   - [ ] My current invoicing tool is too expensive
   - [ ] I want Stripe payments built in
   - [ ] I'm looking for something faster
   - [ ] Other: ___

3. **How many invoices do you send per month?**
   - [ ] 1–5
   - [ ] 6–15
   - [ ] 16–30
   - [ ] 30+

4. **What was your invoicing process before Quick Invoice?** *(open text)*

**Why this matters:** Survey responses determine which acquisition channels to double down on (Q1) and which pain points to address in messaging (Q2–4). Without this data, growth is guesswork.

---

### 2.3 Product-Market Fit Survey (Day 30 — Active Users)

Triggered for users who have sent ≥3 invoices in their first 30 days. Based on Sean Ellis' PMF methodology.

**Single question:**

> *"How would you feel if you could no longer use Quick Invoice?"*
> - 😞 Very disappointed
> - 😐 Somewhat disappointed
> - 🤷 Not disappointed (it isn't that useful)
> - 🔄 N/A — I've already stopped using it

**PMF threshold:** ≥40% "Very disappointed" = early product-market fit signal.
**Current baseline target:** Reach 40% by Day 60 post-launch.

---

### 2.4 Churn Survey

Triggered immediately when a user cancels their Pro subscription (pre-cancel modal, not post-cancel email).

**Questions:**

1. **Why are you cancelling?** *(select one)*
   - [ ] Too expensive
   - [ ] Missing a feature I need
   - [ ] I found a better tool
   - [ ] I'm not freelancing actively right now
   - [ ] Technical issue
   - [ ] Other: ___

2. **Is there anything we could have done to keep you?** *(open text)*

**Response routing:**
- "Too expensive" → offer a 30% discount for 3 months before confirming cancellation
- "Missing a feature" → tag and add to feature backlog
- "Found a better tool" → ask which tool (competitive intel)
- "Not freelancing" → flag for win-back email in 60 days

---

## 3. Referral System

### Design Principles
- Zero friction: sharing happens with one click
- Reward both sides (referrer + referee)
- Tied to the natural "I just got paid" moment

### Referral Flow

```
[User sends invoice] → [Invoice marked as paid]
       ↓
[In-app prompt appears]
"🎉 You just got paid! Know another freelancer who'd love this?
 Share your invite link — they get 1 month free, you get 1 month free."
       ↓
[Unique referral link generated]  e.g. quickinvoice.co/r/[username]
       ↓
[Referee clicks link] → [Signs up] → [Sends first invoice]
       ↓
[Both accounts credited: +1 month Pro free]
```

### Referral Mechanics

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Referrer reward | 1 month Pro free (≈ $12 credit) | Meaningful but not costly |
| Referee reward | 1 month free trial (extended from 14 to 45 days) | Lower barrier to convert |
| Trigger moment | After invoice marked as paid | Highest emotional high — "just got paid" |
| Reward unlock | When referee sends first invoice | Ensures quality referrals, not spam signups |
| Reward cap | 12 months free (12 referrals) | Prevents abuse |

### Referral Share Channels
- **Email:** Pre-written "I use this tool" template the referrer can send
- **Twitter/X:** One-click tweet: *"Just got paid in 2 mins using @QuickInvoice — if you freelance, this is the invoicing tool you've been looking for: [link]"*
- **Copy link:** For WhatsApp, Slack, Discord sharing

### Tracking
- Each referral link has a unique `ref` parameter tracked in PostHog
- Dashboard shows: total referrals sent, signups, activations, credits issued
- Monthly audit: calculate referral-driven CAC vs. organic CAC

### Referral Page (`/refer`)
Simple page accessible from the sidebar. Shows:
- User's unique referral link
- How many people they've referred
- Credits earned
- "Share" buttons (email, Twitter, copy link)

---

## 4. Content Calendar — 4-Week Publishing Plan

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
| Thu May 1 | LinkedIn | Share pillar guide with carousel-style text summary | — | TOFU |
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

