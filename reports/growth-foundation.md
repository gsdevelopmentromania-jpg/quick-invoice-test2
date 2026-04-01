
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
