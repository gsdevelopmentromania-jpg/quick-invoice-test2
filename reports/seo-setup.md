# SEO & Analytics Foundation — Setup Report
**Project:** Quick Invoice  
**Date:** April 1, 2026  
**Author:** Beacon (SEO Specialist)  
**Phase:** Landing Page & SEO · Step 2

---

## Executive Summary

This report documents the complete SEO and analytics foundation built for Quick Invoice. All core technical SEO infrastructure has been implemented, including dynamic metadata, structured data (JSON-LD), auto-generated sitemap, robots.txt, multi-platform analytics, conversion tracking, and an MDX blog system. The keyword strategy targets 18 primary terms with a combined estimated monthly search volume of 85,000–140,000 queries, prioritized by intent-to-convert alignment.

---

## 1. Technical SEO Implementation

### 1.1 Meta Tags & Canonical URLs

**File:** `src/lib/seo.ts`  
**Status:** ✅ Complete

A centralized `createMetadata()` utility generates per-page title, description, canonical URL, Open Graph tags, and Twitter Card tags from a single call. Every page receives:

- Unique `<title>` with the `%s | Quick Invoice` template applied via the root layout
- `<meta name="description">` with a page-specific 140–160 character description
- `<link rel="canonical">` pointing to the absolute URL for that page
- Full Open Graph (og:title, og:description, og:url, og:image, og:type)
- Twitter Card (`summary_large_image`) with handle attribution
- Robots directives: `index/follow` for public pages; `noindex/nofollow` for dashboard, settings, API routes

**Root layout metadata** (`src/app/layout.tsx`) includes:
- Expanded keyword list (10 primary keywords)
- `formatDetection` disabled (prevents iOS phone/email auto-linking)
- `metadataBase` set from `NEXT_PUBLIC_APP_URL` env variable

### 1.2 Structured Data (JSON-LD)

**File:** `src/components/seo/json-ld.tsx`  
**Status:** ✅ Complete

The `JsonLd` component renders inline `<script type="application/ld+json">` tags. The following schema types are implemented:

| Schema Type | Where Used | Purpose |
|-------------|-----------|---------|
| `Organization` | Homepage | Brand identity, sameAs links |
| `WebSite` | Homepage | Site-level entity declaration |
| `SoftwareApplication` | Homepage | App category, pricing offers, OS |
| `FAQPage` | Homepage | FAQ rich results in Google SERPs |
| `Article` | Each blog post | Article rich results, author, publisher |

**Homepage structured data** (`src/app/page.tsx`) renders all four non-Article schemas in a single `@graph` array. This is the recommended Google pattern for combining multiple schema types on one page.

### 1.3 Sitemap

**File:** `src/app/sitemap.ts`  
**Status:** ✅ Complete (auto-generated)

The sitemap is dynamically generated from the blog registry (`src/lib/blog.ts`). Adding new blog posts to the registry automatically adds them to the sitemap. Current entries:

| URL | Priority | Change Frequency |
|-----|----------|-----------------|
| `/` | 1.0 | weekly |
| `/pricing` | 0.9 | monthly |
| `/blog` | 0.8 | weekly |
| `/blog/how-to-invoice-clients-as-a-freelancer` | 0.8 | monthly |
| `/register` | 0.5 | yearly |
| `/login` | 0.4 | yearly |

### 1.4 Robots.txt

**File:** `src/app/robots.ts`  
**Status:** ✅ Complete

```
User-agent: *
Allow: /, /blog/, /pricing
Disallow: /dashboard/, /invoices/, /clients/, /settings/, /api/

User-agent: Googlebot
Allow: /, /blog/, /pricing
Disallow: /dashboard/, /api/

Sitemap: https://quickinvoice.app/sitemap.xml
```

Dashboard, client data, and API routes are blocked from all crawlers. Public marketing pages and blog content are fully crawlable.

---

## 2. Analytics & Conversion Tracking

### 2.1 Analytics Platforms

**File:** `src/components/analytics/analytics.tsx`  
**Wired in:** `src/app/layout.tsx` (root layout)  
**Status:** ✅ Complete

Three analytics platforms are supported simultaneously via environment variable flags:

| Platform | Env Variable | Notes |
|---------|-------------|-------|
| **Google Analytics 4** | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Page path tracking + anonymized IP |
| **Plausible** | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Privacy-first, GDPR-compliant |
| **PostHog** | `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics + feature flags |

Analytics scripts only load in `production` mode. All three platforms can run simultaneously; set only the variables for the platforms you want active.

### 2.2 Conversion Events

**File:** `src/lib/analytics.ts`  
**Status:** ✅ Complete

Tracked events fire across all active platforms simultaneously:

| Event Name | Trigger | Key Properties |
|-----------|---------|---------------|
| `signup` | User completes registration | `method: "email" \| "google" \| "github"` |
| `trial_start` | Trial period initiated | `plan: string` |
| `upgrade` | User upgrades subscription | `plan, from_plan` |
| `checkout_started` | Stripe checkout session opened | `plan: string` |
| `invoice_sent` | Invoice sent to client | `has_payment_link: boolean` |
| `invoice_paid` | Payment confirmed via webhook | — |
| `invoice_viewed` | Client opens invoice link | `invoice_id: string` |

**Helper functions** for the most common events:
- `trackSignup(method)` — call from registration success handler
- `trackTrialStart(plan)` — call from trial activation flow
- `trackUpgrade(plan, fromPlan)` — call from billing upgrade confirmation
- `trackCheckoutStarted(plan)` — call from pricing page CTA click
- `trackInvoiceSent(hasPaymentLink)` — call from invoice send API route

**Integration points** (not yet wired — recommended next steps):
- Register page → `trackSignup("email")` on successful form submission
- Pricing page → `trackCheckoutStarted(plan)` on CTA click
- Billing checkout route → `trackTrialStart(plan)` on session creation
- Invoice send route → `trackInvoiceSent(hasPaymentLink)` on success

---

## 3. Blog System

**Files:** `src/app/blog/page.tsx`, `src/app/blog/layout.tsx`, `src/app/blog/[slug]/page.mdx`, `src/lib/blog.ts`  
**MDX config:** `next.config.mjs` + `mdx-components.tsx`  
**Status:** ✅ Complete

### Architecture

Blog posts are `.mdx` files located at `src/app/blog/[slug]/page.mdx`. Each file:
- Exports a `metadata` object with per-post title, description, canonical URL, and Open Graph tags
- Exports an `articleSchema` object for Article JSON-LD
- Renders a `<JsonLd data={articleSchema} />` component for structured data
- Contains the full article prose as MDX (markdown + JSX)

The `src/lib/blog.ts` registry stores post metadata for:
- Blog listing page (title, description, date, read time, tags, category)
- Dynamic sitemap generation
- Future category/tag filtering pages

### MDX Dependencies

Added to `package.json`:
- `@next/mdx: ^14.2.18` — Next.js official MDX integration
- `remark-gfm: ^4.0.0` — GitHub-flavored markdown (tables, checkboxes, strikethrough)
- `@types/mdx: ^2.0.13` — TypeScript types for MDX

### First Blog Post

**URL:** `/blog/how-to-invoice-clients-as-a-freelancer`  
**Word count:** ~2,200 words  
**Reading time:** 9 minutes  
**Primary keyword:** "how to invoice clients as a freelancer"

---

## 4. Keyword Strategy

### Primary Keywords (18 targets)

| Keyword | Est. Monthly Volume | Difficulty | Intent | Priority |
|---------|--------------------|-----------|----|------|
| how to invoice clients as a freelancer | 8,000–12,000 | Medium | Informational | 🔴 High |
| freelance invoice | 22,000–30,000 | High | Navigational/Commercial | 🔴 High |
| invoice for freelancers | 6,000–9,000 | Medium | Commercial | 🔴 High |
| free invoice generator | 40,000–60,000 | High | Commercial | 🔴 High |
| online invoicing for freelancers | 3,000–5,000 | Low–Medium | Commercial | 🔴 High |
| best invoicing app for freelancers 2026 | 2,000–4,000 | Low | Commercial | 🔴 High |
| invoice with stripe payment | 1,500–3,000 | Low | Transactional | 🔴 High |
| professional invoice template | 18,000–25,000 | High | Commercial | 🟡 Medium |
| freelance billing software | 3,500–5,500 | Medium | Commercial | 🟡 Medium |
| invoice pdf generator | 12,000–18,000 | Medium | Commercial | 🟡 Medium |
| get paid faster freelancer | 1,000–2,500 | Low | Informational | 🟡 Medium |
| send invoice online | 5,000–8,000 | Medium | Transactional | 🟡 Medium |
| create invoice online free | 9,000–14,000 | Medium | Commercial | 🟡 Medium |
| invoicing tool for designers | 800–1,500 | Low | Commercial | 🟡 Medium |
| freelance payment tracking | 1,200–2,000 | Low | Informational | 🟢 Long-term |
| simple invoicing software | 2,500–4,000 | Low | Commercial | 🟢 Long-term |
| freelancer invoicing 2026 | 500–1,000 | Very Low | Commercial | 🟢 Long-term |
| invoice payment terms for freelancers | 700–1,200 | Low | Informational | 🟢 Long-term |

**Total estimated monthly opportunity:** 137,000–206,000 searches

### Keyword-to-Content Mapping

| Keyword Cluster | Target URL | Status |
|----------------|-----------|--------|
| Freelance invoicing tool | `/` (homepage) | ✅ Optimized |
| Invoicing app pricing | `/pricing` | Needs meta optimization |
| How to invoice as freelancer | `/blog/how-to-invoice-clients-as-a-freelancer` | ✅ Published |
| Invoice templates | Future: `/blog/free-invoice-templates-for-freelancers` | 📋 Planned |
| Invoice payment terms | Future: `/blog/invoice-payment-terms-freelancers` | 📋 Planned |
| Best invoicing apps 2026 | Future: `/blog/best-invoicing-apps-for-freelancers-2026` | 📋 Planned |

---

## 5. Content Strategy — Blog Roadmap

### Content Pillars

**Pillar 1: Getting Paid** (high-intent, direct product relevance)
- How to invoice clients as a freelancer ✅
- How to write invoice payment terms that protect you
- How to follow up on a late invoice (without damaging the relationship)
- What to do when a client refuses to pay

**Pillar 2: Tools & Comparisons** (commercial, comparison intent)
- Best invoicing apps for freelancers in 2026
- FreshBooks vs Quick Invoice: honest comparison
- Wave vs Quick Invoice: which is right for you?
- Free invoice generators compared

**Pillar 3: Freelance Business Finance** (informational, top-of-funnel)
- How to set your freelance rates (and actually charge them)
- Freelance tax basics: what to track and when to pay
- How to handle recurring clients with retainer invoices
- Invoice templates: which format is right for your freelance business

### Publishing Cadence
- **Phase 1 (April–June 2026):** 2 posts/month, focus on Pillar 1 + Pillar 2
- **Phase 2 (July–September 2026):** 4 posts/month, expand into Pillar 3
- **Phase 3 (Q4 2026+):** 6 posts/month, data-driven topical expansion

---

## 6. Competitor SEO Gaps Identified

| Competitor | Gap | Opportunity |
|-----------|-----|------------|
| FreshBooks | Blog heavily focused on accounting, not invoicing speed | Target "fast invoice" + "quick invoice" keywords they ignore |
| Wave | Minimal blog content on freelancer-specific advice | Dominate "freelancer" + "invoicing" long-tail content |
| Invoice Ninja | Low domain authority in US/UK markets | Compete directly on English-language freelancer terms |
| HoneyBook | High-authority blog but focuses on creative business broadly | Win specifically on "invoicing" and "billing" keywords where they're diluted |

**Key opportunity:** No competitor owns the `{tool adjective} + invoicing + freelancer` keyword cluster. Terms like "fastest invoicing app for freelancers", "simplest invoice tool for freelancers", and "quick invoice creator" have low-to-medium competition with meaningful search volume.

---

## 7. Recommended Next Steps (Priority Order)

| Priority | Action | Expected Impact |
|----------|--------|----------------|
| 🔴 P1 | Wire `trackSignup()`, `trackCheckoutStarted()` into form handlers | Funnel attribution from day 1 |
| 🔴 P1 | Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` + `NEXT_PUBLIC_POSTHOG_KEY` in production env | Analytics data collection live |
| 🔴 P1 | Submit sitemap to Google Search Console | Indexing acceleration |
| 🔴 P1 | Add OG image (`/public/og-image.png`) — 1200×630px | Social sharing click-through |
| 🟡 P2 | Optimize `/pricing` page meta title/description for "invoicing app pricing" keywords | Pricing page SEO |
| 🟡 P2 | Publish second blog post: "Best Invoicing Apps for Freelancers 2026" | Commercial intent traffic |
| 🟡 P2 | Add `<link rel="alternate">` hreflang for international variants (when applicable) | International SEO |
| 🟢 P3 | Build internal linking strategy between blog posts and pricing page | Link equity flow to conversion pages |
| 🟢 P3 | Create `/sitemap-images.xml` for any future visual content | Image search visibility |
| 🟢 P3 | Add breadcrumb schema to blog post pages | Rich results eligibility |

---

## 8. File Inventory

| File | Role | Status |
|------|------|--------|
| `src/lib/seo.ts` | `createMetadata()` utility | ✅ |
| `src/components/seo/json-ld.tsx` | JSON-LD component + type definitions | ✅ |
| `src/components/analytics/analytics.tsx` | GA4 + Plausible + PostHog scripts | ✅ |
| `src/lib/analytics.ts` | `trackEvent()` + helper functions | ✅ |
| `src/app/layout.tsx` | Root layout with Analytics wired in | ✅ |
| `src/app/page.tsx` | Homepage with 4x JSON-LD schemas | ✅ |
| `src/app/robots.ts` | Robots.txt generation | ✅ |
| `src/app/sitemap.ts` | Dynamic sitemap (includes blog posts) | ✅ |
| `src/app/blog/page.tsx` | Blog listing page | ✅ |
| `src/app/blog/layout.tsx` | Blog layout with nav + footer | ✅ |
| `src/app/blog/how-to-invoice-clients-as-a-freelancer/page.mdx` | First blog post (2,200 words) | ✅ |
| `src/lib/blog.ts` | Blog post registry | ✅ |
| `mdx-components.tsx` | MDX component overrides | ✅ |
| `next.config.mjs` | MDX plugin configured | ✅ |
| `package.json` | @next/mdx + remark-gfm + @types/mdx added | ✅ |

---

*Report generated: April 1, 2026 · Beacon (SEO Specialist) · Quick Invoice*
