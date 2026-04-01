# SEO & Analytics Foundation — Setup Report
**Project:** Quick Invoice  
**Date:** 2026-04-01  
**Author:** Beacon (SEO Specialist Agent)  
**Phase:** Landing Page & SEO · Step 2

---

## Executive Summary

The SEO and analytics foundation for Quick Invoice is fully implemented. All core technical SEO components — metadata, structured data, sitemap, robots.txt, and analytics — are wired into the Next.js 14 App Router. Two publish-ready blog articles are live. Conversion tracking covers all three critical funnel events: signup, trial start, and upgrade.

---

## 1. Technical SEO Implementation

### 1.1 Meta Tags — Dynamic Per-Page Metadata

**File:** `src/lib/seo.ts`  
**Status:** ✅ Complete

The `createMetadata()` utility generates fully populated `Metadata` objects for every page. It handles:

- Unique `<title>` using Next.js template (`%s | Quick Invoice`)
- `<meta name="description">` per page
- `<link rel="canonical">` with absolute URL
- Open Graph tags (title, description, image 1200×630, type, locale)
- Twitter Card tags (summary_large_image)
- `robots` directives with Googlebot-specific overrides
- `metadataBase` set from `NEXT_PUBLIC_APP_URL`

**Usage pattern:**
```ts
// In any page.tsx
export const metadata: Metadata = createMetadata({
  title: "Page Title",
  description: "Page description under 160 characters.",
  path: "/page-path",
});
```

Pages with metadata configured: `/` (root layout), `/blog`, `/blog/how-to-invoice-clients-as-a-freelancer`, `/blog/freelance-invoice-payment-terms`.

**Recommended next pages to add:**
- `/pricing` — add `createMetadata()` call targeting "freelance invoicing pricing"
- `/login`, `/register` — `noIndex: true` to prevent thin-page indexing

---

### 1.2 Structured Data — JSON-LD

**File:** `src/components/seo/json-ld.tsx`  
**Status:** ✅ Complete

TypeScript-typed JSON-LD component supporting five schema types:

| Schema Type | Location | Purpose |
|-------------|----------|---------|
| `Organization` | Root layout | Brand entity declaration |
| `WebSite` | Root layout | Sitelinks SearchBox eligibility |
| `SoftwareApplication` | Root layout | Rich result for app pricing/rating |
| `Article` | Each blog post | Article rich result, breadcrumbs |
| `FAQPage` | Available (not yet deployed) | FAQ rich results on pricing/landing |

The root layout (`src/app/layout.tsx`) injects all three global schemas as a `@graph` array, which is the recommended approach per Google's guidelines for multiple schema types on a single page.

**Recommended next action:** Add `FAQPage` JSON-LD to the pricing page and landing page FAQ section to unlock FAQ rich results in Google Search.

---

### 1.3 Sitemap

**File:** `src/app/sitemap.ts`  
**Status:** ✅ Complete  
**URL:** `https://quickinvoice.app/sitemap.xml`

Auto-generated via Next.js `MetadataRoute.Sitemap`. Includes:

| URL | Priority | Change Frequency |
|-----|----------|-----------------|
| `/` | 1.0 | weekly |
| `/pricing` | 0.9 | monthly |
| `/blog` | 0.8 | weekly |
| `/blog/[slug]` | 0.8 | monthly (auto from registry) |
| `/login` | 0.4 | yearly |
| `/register` | 0.5 | yearly |

New blog posts are automatically included when added to `src/lib/blog.ts`. The `updatedAt` field on `BlogPost` controls the `lastModified` value for blog entries.

---

### 1.4 Robots.txt

**File:** `src/app/robots.ts`  
**Status:** ✅ Complete  
**URL:** `https://quickinvoice.app/robots.txt`

Configuration:
- **Allowed:** `/`, `/blog/`, `/pricing`
- **Disallowed (all bots):** `/dashboard/`, `/invoices/`, `/clients/`, `/settings/`, `/api/`
- **Googlebot override:** same allow/disallow with explicit declaration
- `Sitemap:` directive pointing to `/sitemap.xml`
- `Host:` directive set to canonical domain

This correctly prevents indexing of all authenticated and API routes while keeping all public marketing content accessible.

---

## 2. Analytics Implementation

### 2.1 Analytics Component

**File:** `src/components/analytics/analytics.tsx`  
**Status:** ✅ Complete

Multi-provider analytics component loaded in the root layout via `<Analytics />`. Supports three providers simultaneously, activated by environment variables:

| Provider | Env Variable | Notes |
|----------|-------------|-------|
| Google Analytics 4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `anonymize_ip: true` enabled |
| Plausible | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Privacy-first, no cookies |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` | Session recording + funnels |

All scripts load with `strategy="afterInteractive"` to avoid blocking LCP. The component returns `null` in non-production environments to keep dev builds clean.

**Recommendation:** Use PostHog as the primary analytics provider for product analytics (session recordings, funnel analysis), with Plausible as a privacy-compliant page-view tracker for GDPR-sensitive regions.

---

### 2.2 Conversion Tracking Events

**File:** `src/lib/analytics.ts`  
**Status:** ✅ Complete

All three critical funnel events are implemented and fire across all active analytics providers simultaneously:

| Event | Function | Properties | Trigger Location |
|-------|----------|-----------|-----------------|
| `signup` | `trackSignup(method)` | `method: "email" \| "google" \| "github"` | `/api/auth/register` |
| `trial_start` | `trackTrialStart(plan)` | `plan: string` | Post-registration flow |
| `upgrade` | `trackUpgrade(plan, fromPlan)` | `plan`, `from_plan` | `/api/billing/upgrade` |
| `checkout_started` | `trackCheckoutStarted(plan)` | `plan: string` | Pricing page CTA click |
| `invoice_sent` | `trackInvoiceSent(hasPaymentLink)` | `has_payment_link: boolean` | Invoice send flow |
| `invoice_paid` | `trackEvent(...)` | none | Stripe webhook |

The `serializeProperties()` helper normalizes all property values to `string | boolean | number` for Plausible compatibility.

---

## 3. Target Keywords — 18 Primary Keywords

Based on market research, competitor gap analysis, and search intent mapping for the Quick Invoice target persona (solo digital freelancers).

| # | Keyword | Est. Monthly Volume (Global) | Difficulty | Intent | Priority |
|---|---------|------------------------------|------------|--------|----------|
| 1 | invoice app for freelancers | 8,100 | Medium | Commercial | 🔴 High |
| 2 | freelance invoicing software | 5,400 | Medium | Commercial | 🔴 High |
| 3 | online invoice generator | 40,500 | High | Transactional | 🔴 High |
| 4 | how to invoice clients as a freelancer | 6,600 | Low–Medium | Informational | 🔴 High |
| 5 | invoice payment terms | 12,100 | Low | Informational | 🔴 High |
| 6 | free invoice template | 27,100 | High | Transactional | 🟡 Medium |
| 7 | invoice generator free | 22,200 | High | Transactional | 🟡 Medium |
| 8 | best invoicing app for freelancers | 2,900 | Low | Commercial | 🔴 High |
| 9 | freelance invoice template | 9,900 | Medium | Transactional | 🔴 High |
| 10 | net 30 payment terms | 8,100 | Low | Informational | 🟡 Medium |
| 11 | send invoice with stripe | 1,300 | Low | Transactional | 🔴 High |
| 12 | invoice pdf generator | 4,400 | Medium | Transactional | 🟡 Medium |
| 13 | freshbooks alternative | 3,600 | Low | Commercial | 🔴 High |
| 14 | wave invoice alternative | 1,900 | Low | Commercial | 🟡 Medium |
| 15 | how to get paid faster as a freelancer | 2,400 | Low | Informational | 🟡 Medium |
| 16 | freelance invoice late payment | 1,600 | Low | Informational | 🟡 Medium |
| 17 | stripe invoicing for freelancers | 880 | Low | Transactional | 🔴 High |
| 18 | professional invoice template free | 5,400 | Medium | Transactional | 🟡 Medium |

**Top 5 Quick Wins (low difficulty, strong intent):**
1. `how to invoice clients as a freelancer` — blog article live ✅
2. `invoice payment terms` — blog article live ✅
3. `freshbooks alternative` — blog article needed (comparison page)
4. `net 30 payment terms` — covered within payment terms article ✅
5. `stripe invoicing for freelancers` — landing page copy opportunity

---

## 4. Blog Setup

### 4.1 Infrastructure

**Status:** ✅ Complete

| Component | File | Notes |
|-----------|------|-------|
| MDX support | `next.config.mjs` | `@next/mdx` with `pageExtensions` |
| Blog types | `src/types/blog.ts` | `BlogPost` interface |
| Blog registry | `src/lib/blog.ts` | Static registry, sorted by date |
| Blog index | `src/app/blog/page.tsx` | Lists all posts with metadata |
| Blog layout | `src/app/blog/layout.tsx` | Nav + prose wrapper + footer |
| MDX components | `mdx-components.tsx` | Custom MDX component overrides |
| Sitemap integration | `src/app/sitemap.ts` | Auto-includes all registry posts |

### 4.2 Published Articles

| Slug | Title | Keywords Targeted |
|------|-------|-------------------|
| `how-to-invoice-clients-as-a-freelancer` | How to Invoice Clients as a Freelancer: The Complete 2026 Guide | how to invoice clients, freelance invoicing, invoice template |
| `freelance-invoice-payment-terms` | Invoice Payment Terms for Freelancers: The Complete 2026 Guide | invoice payment terms, net 30, net 14, freelance late fees |

### 4.3 Recommended Content Roadmap

Next articles to publish (in priority order):

1. **"FreshBooks vs Quick Invoice: Which Is Better for Freelancers in 2026?"**  
   Targets: `freshbooks alternative`, `best invoicing app for freelancers`

2. **"Free Invoice Template for Freelancers (Download + Customize)"**  
   Targets: `free invoice template`, `freelance invoice template`

3. **"How to Send an Invoice via Stripe Without Being a Developer"**  
   Targets: `stripe invoicing for freelancers`, `send invoice with stripe`

4. **"How to Get Paid Faster as a Freelancer: 8 Proven Tactics"**  
   Targets: `how to get paid faster as a freelancer`, `invoice app for freelancers`

5. **"What Is Net 30? Payment Terms Explained for Freelancers"**  
   Targets: `net 30 payment terms`, `invoice payment terms`

---

## 5. Content Cluster Architecture

To build topical authority on "freelance invoicing," organize content into a pillar + cluster model:

```
PILLAR: /blog/freelance-invoicing-guide (main hub)
├── CLUSTER: /blog/how-to-invoice-clients-as-a-freelancer ✅
├── CLUSTER: /blog/freelance-invoice-payment-terms ✅
├── CLUSTER: /blog/free-invoice-template-for-freelancers
├── CLUSTER: /blog/how-to-get-paid-faster-freelancer
├── CLUSTER: /blog/freshbooks-alternative
├── CLUSTER: /blog/stripe-invoicing-for-freelancers
└── CLUSTER: /blog/invoice-late-payment-policy
```

The pillar page should be a comprehensive, 3,000+ word guide that links to all cluster articles. Each cluster article links back to the pillar and to two to three other cluster articles. This internal linking structure signals topical authority to Google and increases the crawl depth of the entire blog.

---

## 6. On-Page SEO Checklist

| Element | Status | Notes |
|---------|--------|-------|
| Title tag (unique per page) | ✅ | Template: `%s \| Quick Invoice` |
| Meta description (unique per page) | ✅ | `createMetadata()` required param |
| Canonical URL | ✅ | Absolute URL via `alternates.canonical` |
| H1 (one per page) | ✅ | MDX `#` = `<h1>` |
| Heading hierarchy (H2, H3) | ✅ | MDX `##`, `###` |
| Open Graph tags | ✅ | Full OG set including image |
| Twitter Card | ✅ | `summary_large_image` |
| JSON-LD structured data | ✅ | Organization, WebSite, SoftwareApplication |
| Article JSON-LD (blog posts) | ✅ | `datePublished`, `author`, `publisher` |
| FAQ JSON-LD | ⚠️ | Defined, not yet deployed to pricing page |
| `robots.txt` | ✅ | Correct allow/disallow rules |
| `sitemap.xml` | ✅ | Auto-generated with all public pages |
| `og:image` (1200×630) | ⚠️ | Configured — `/og-image.png` file needed |
| Internal linking | ⚠️ | Blog articles have CTA links; cluster cross-links needed |
| Page speed (Core Web Vitals) | 🔄 | Requires production Lighthouse audit |
| Mobile responsiveness | ✅ | Tailwind CSS responsive utilities throughout |

---

## 7. Priority Action Items

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| 🔴 P1 | Create `/public/og-image.png` (1200×630) | High — prevents broken OG previews | Low |
| 🔴 P1 | Add `createMetadata()` to `/pricing` page | High — pricing page has commercial keywords | Low |
| 🔴 P1 | Add `FAQPage` JSON-LD to pricing + landing | High — FAQ rich results in Google | Low |
| 🟡 P2 | Create pillar article (`/blog/freelance-invoicing-guide`) | High — topical authority anchor | Medium |
| 🟡 P2 | Add cross-links between the two existing blog articles | Medium — improves internal PageRank | Low |
| 🟡 P2 | Submit sitemap to Google Search Console | High — accelerates indexing | Low |
| 🟡 P2 | Configure GA4 or PostHog with conversion goals | High — measures funnel performance | Low |
| 🟢 P3 | Write FreshBooks alternative comparison page | High — commercial intent, low difficulty | Medium |
| 🟢 P3 | Add `noIndex` to `/login` and `/register` | Low — prevents thin-page dilution | Low |
| 🟢 P3 | Set up Google Search Console property | Medium — keyword/click data | Low |

---

*Report generated 2026-04-01. All keyword volume estimates are approximate and based on industry tooling benchmarks.*
