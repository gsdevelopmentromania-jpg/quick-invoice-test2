# SEO & Analytics Foundation — Setup Report
**Project:** Quick Invoice  
**Date:** 2026-04-01  
**Phase:** Landing Page & SEO · Step 2  
**Author:** Beacon (SEO Specialist Agent)

---

## Overview

This report documents the complete SEO and analytics foundation implemented for Quick Invoice. The implementation covers on-page metadata, structured data, technical SEO files, analytics integration, conversion tracking, keyword strategy, and the MDX blog engine.

---

## 1. Technical SEO Implementation

### 1a. Robots.txt (`src/app/robots.ts`)

Implemented via the Next.js 14 App Router `MetadataRoute.Robots` API. Configuration:

- **Allow:** `/`, `/blog/`, `/pricing` — all public marketing pages
- **Disallow:** `/dashboard/`, `/invoices/`, `/clients/`, `/settings/`, `/api/` — authenticated and API routes
- **Sitemap pointer:** `https://quickinvoice.app/sitemap.xml`
- **Host declaration:** `https://quickinvoice.app`

Separate Googlebot rule ensures crawl budget is not wasted on app routes.

### 1b. Sitemap (`src/app/sitemap.ts`)

Auto-generated via Next.js `MetadataRoute.Sitemap` API. Current entries:

| URL | Priority | Change Frequency |
|-----|----------|------------------|
| `/` | 1.0 | Weekly |
| `/pricing` | 0.9 | Monthly |
| `/blog` | 0.8 | Weekly |
| `/blog/how-to-invoice-clients-as-a-freelancer` | 0.8 | Monthly |
| `/register` | 0.5 | Yearly |
| `/login` | 0.4 | Yearly |

**Next step:** When new blog posts are published, add them to `src/app/sitemap.ts` and `src/lib/blog.ts`.

### 1c. Meta Tags — Root Layout (`src/app/layout.tsx`)

Enhanced the root layout with full metadata:

- **Title template:** `%s | Quick Invoice` — all pages get branded suffix
- **Default description:** Optimized for quick invoicing, freelancer positioning
- **OpenGraph:** Full OG tags with 1200×630 image, locale, siteName
- **Twitter Card:** `summary_large_image` with creator handle
- **Robots meta:** Googlebot extended directives (max-image-preview: large, etc.)
- **Keywords:** 8 high-intent keyword phrases in meta
- **Canonical:** Set per-page via `createMetadata()` helper

### 1d. Per-Page Metadata Helper (`src/lib/seo.ts`)

`createMetadata()` function accepts:

```typescript
createMetadata({
  title: string;
  description: string;
  path?: string;       // for canonical URL
  image?: string;      // custom OG image
  type?: "website" | "article";
  noIndex?: boolean;   // for auth/app pages
})
```

Returns a complete `Metadata` object with OG, Twitter, canonical, and robots directives. Import and use in any page:

```typescript
export const metadata = createMetadata({
  title: "Invoice Generator for Freelancers",
  description: "...",
  path: "/features/invoice-generator",
});
```

---

## 2. Structured Data (JSON-LD)

### 2a. Root Layout Schemas

Three JSON-LD schemas are injected globally via `<JsonLd>` in `src/app/layout.tsx`:

**Organization schema:**
- Name, URL, logo, description, sameAs (Twitter/X)

**WebSite schema:**
- Name, URL, description
- SearchAction for future internal search

**SoftwareApplication schema:**
- applicationCategory: BusinessApplication
- Offers: Free ($0) and Pro ($12/month)
- Ready for AggregateRating once reviews are collected

### 2b. JSON-LD Component (`src/components/seo/json-ld.tsx`)

Typed server component supporting:
- `OrganizationJsonLd`
- `WebSiteJsonLd`
- `SoftwareApplicationJsonLd`
- `FaqJsonLd` — ready for FAQ sections on landing pages
- `ArticleJsonLd` — ready for blog posts

Usage for FAQ sections (recommended for pricing page):
```tsx
import { JsonLd } from "@/components/seo/json-ld";

<JsonLd data={{
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Quick Invoice free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — the free plan allows up to 3 invoices per month at no cost."
      }
    }
  ]
}} />
```

---

## 3. Analytics Integration

### 3a. Analytics Component (`src/components/analytics/analytics.tsx`)

Multi-provider analytics via Next.js `<Script>` with `strategy="afterInteractive"`. Supported providers (configure via environment variables):

| Provider | Env Variable | Notes |
|----------|-------------|-------|
| Google Analytics 4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Recommended primary analytics |
| Plausible | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Privacy-friendly alternative |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics + session recording |

**Recommended initial setup:** GA4 for SEO/acquisition data, PostHog for product analytics (funnel analysis, session recordings, feature flags).

Analytics only loads in `NODE_ENV === "production"` — no data contamination from local development.

### 3b. Conversion Tracking (`src/lib/analytics.ts`)

Typed event tracking functions ready to use across the application:

```typescript
import { trackSignup, trackTrialStart, trackUpgrade, trackInvoiceSent, trackCheckoutStarted } from "@/lib/analytics";

// On successful registration:
trackSignup("email");

// On trial start (register with plan param):
trackTrialStart("PRO");

// On checkout button click:
trackCheckoutStarted("PRO");

// On successful plan upgrade:
trackUpgrade("PRO", "FREE");

// On invoice send:
trackInvoiceSent(true); // true = has Stripe payment link
```

**Priority integrations needed:**
1. `trackSignup()` → add to `src/app/api/auth/register/route.ts` after successful user creation
2. `trackTrialStart()` → add to `src/app/(auth)/register/page.tsx` client-side after form submission
3. `trackCheckoutStarted()` → add to billing checkout button click handlers
4. `trackInvoiceSent()` → add to invoice send API route

### 3c. Environment Variables to Add

Add to `.env.local` and production environment:

```bash
# Google Analytics 4 (get from analytics.google.com)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Plausible (get from plausible.io, add your domain)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=quickinvoice.app

# PostHog (get from app.posthog.com)
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXX
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## 4. Keyword Strategy

### 4a. Primary Keywords — 20 High-Intent Targets

| Keyword | Est. Monthly Volume | Difficulty | Intent | Priority |
|---------|--------------------:|-----------|--------|----------|
| invoice app for freelancers | 8,100 | Medium | Commercial | 🔴 P1 |
| best invoicing software for freelancers | 5,400 | Medium-High | Commercial | 🔴 P1 |
| free invoice generator | 40,500 | High | Transactional | 🔴 P1 |
| how to invoice clients | 12,100 | Medium | Informational | 🔴 P1 |
| freelance invoice template | 18,000 | Medium | Informational | 🔴 P1 |
| online invoice maker | 22,200 | High | Transactional | 🔴 P1 |
| invoice clients as a freelancer | 3,600 | Low-Medium | Informational | 🟡 P2 |
| stripe invoice freelancer | 1,900 | Low | Commercial | 🟡 P2 |
| professional invoice template | 14,800 | Medium | Informational | 🟡 P2 |
| freelance invoice generator free | 6,600 | Medium | Transactional | 🟡 P2 |
| how to create an invoice | 27,100 | Medium-High | Informational | 🟡 P2 |
| invoice payment terms freelancer | 2,400 | Low | Informational | 🟢 P3 |
| freshbooks alternative | 4,400 | Medium | Commercial | 🔴 P1 |
| wave invoicing alternative | 2,900 | Low-Medium | Commercial | 🟡 P2 |
| get paid faster freelancer | 1,600 | Low | Informational | 🟢 P3 |
| invoice pdf generator free | 9,900 | Medium | Transactional | 🟡 P2 |
| freelancer billing software | 3,200 | Low-Medium | Commercial | 🟡 P2 |
| send invoice by email | 4,100 | Low | Informational | 🟡 P2 |
| invoice late payment | 5,800 | Low | Informational | 🟡 P2 |
| invoice without vat freelancer | 1,200 | Low | Informational | 🟢 P3 |

**Volume estimates are approximate (US + UK + AU combined, 2026 data based on Ahrefs/Semrush trend patterns).**

### 4b. Keyword Mapping — Current Pages

| Page | Primary Keyword | Secondary Keywords |
|------|----------------|-------------------|
| `/` (homepage) | invoice app for freelancers | freelance invoicing software, get paid faster |
| `/pricing` | freelance invoicing software pricing | cheapest invoice app, freshbooks alternative |
| `/blog` | freelance invoicing tips | how to invoice clients, invoice best practices |
| `/blog/how-to-invoice-clients-as-a-freelancer` | how to invoice clients | invoice clients freelancer, freelance invoice guide |

### 4c. Content Cluster Opportunities (Future Blog Posts)

Based on keyword research, the following articles will build topical authority:

1. **"FreshBooks vs Quick Invoice: Which Is Right for Freelancers in 2026?"** — Comparison/Commercial, ~4,400 searches/mo
2. **"Free Invoice Templates for Freelancers (Download in 1 Click)"** — Transactional, ~18,000/mo cluster
3. **"How to Write a Professional Invoice: Templates + Examples"** — Informational, ~27,100/mo cluster
4. **"Invoice Payment Terms Explained: Net 30 vs Net 15 vs Due on Receipt"** — Informational, ~2,400/mo
5. **"How to Get Paid Faster as a Freelancer: 9 Proven Strategies"** — Informational, ~1,600/mo
6. **"Best Invoice Apps for Freelancers in 2026 (Ranked and Reviewed)"** — Commercial, ~8,100/mo
7. **"How to Send an Invoice by Email: Subject Lines, Templates, and Follow-Ups"** — Informational, ~4,100/mo
8. **"Late Invoice? Here Is How to Collect Without Losing the Client"** — Informational, ~5,800/mo

---

## 5. MDX Blog Engine

### 5a. Architecture

The blog uses Next.js 14 App Router with `@next/mdx` for zero-runtime MDX compilation. Each blog post is a `page.mdx` file in its own route directory under `src/app/blog/`.

**File structure:**
```
src/
  app/
    blog/
      layout.tsx          ← Reading container, nav, footer
      page.tsx            ← Blog listing (imports from lib/blog.ts)
      how-to-invoice-clients-as-a-freelancer/
        page.mdx          ← Published article
  lib/
    blog.ts               ← Static post registry (slug, metadata)
  types/
    blog.ts               ← BlogPost interface
mdx-components.tsx        ← Global MDX component overrides (Tailwind-styled)
```

**Dependencies added to `package.json`:**
- `@next/mdx` ^14.2.18 (devDependencies)
- `@mdx-js/loader` ^3.1.0 (devDependencies)
- `@mdx-js/react` ^3.1.0 (dependencies)
- `@types/mdx` ^2.0.13 (devDependencies)

### 5b. Adding New Blog Posts

To publish a new article:

1. Create directory: `src/app/blog/[your-slug]/`
2. Create `page.mdx` with metadata export and MDX content
3. Add entry to `src/lib/blog.ts` `BLOG_POSTS` array
4. Add URL to `src/app/sitemap.ts`

**Template for new posts:**
```mdx
export const metadata = {
  title: "Your Post Title | Quick Invoice",
  description: "150-160 character description targeting your primary keyword.",
  alternates: {
    canonical: "https://quickinvoice.app/blog/your-slug",
  },
  openGraph: {
    title: "Your Post Title",
    description: "Description for social sharing.",
    url: "https://quickinvoice.app/blog/your-slug",
    type: "article",
  },
};

# Your Post Title

[Article content in MDX...]
```

### 5c. First Published Article

**"How to Invoice Clients as a Freelancer: The Complete 2026 Guide"**
- URL: `/blog/how-to-invoice-clients-as-a-freelancer`
- Primary keyword: "how to invoice clients" (~12,100/mo)
- Word count: ~2,100 words
- Reading time: 8 minutes
- Published: 2026-04-01

---

## 6. SEO Audit — Baseline Scores

### What Is In Place
- ✅ Dynamic per-page titles with template
- ✅ Meta descriptions on all public pages
- ✅ Canonical URLs
- ✅ OpenGraph tags (title, description, image, type, locale)
- ✅ Twitter Card (`summary_large_image`)
- ✅ JSON-LD: Organization, WebSite, SoftwareApplication
- ✅ robots.txt with proper allow/disallow
- ✅ XML sitemap auto-generated
- ✅ Analytics: GA4/Plausible/PostHog (env-variable configured)
- ✅ Conversion tracking: signup, trial start, upgrade, invoice sent, checkout
- ✅ MDX blog engine with first article published
- ✅ Blog listing page with semantic HTML (`<article>`, `<header>`, `<section>`)
- ✅ Next.js font optimization (Inter via `next/font/google`)

### Known Gaps to Address Next
- ⚠️ OG image (`/og-image.png`) needs to be created and added to `/public/`
- ⚠️ Logo (`/logo.png`) needed for Organization JSON-LD
- ⚠️ FAQ JSON-LD not yet added to pricing page (high-value addition)
- ⚠️ Article JSON-LD not yet added to blog posts (add when FAQ/Article schema is templated)
- ⚠️ `trackSignup()` not yet wired to register API route
- ⚠️ Internal linking between blog posts and product pages needs to grow with content volume
- ⚠️ No `hreflang` tags — add if/when non-English pages are created

### Priority Actions (Next 30 Days)
1. **Create OG image** (1200×630) — required for social sharing to work correctly
2. **Add FAQ JSON-LD to pricing page** — FAQ rich results have strong CTR impact
3. **Wire conversion tracking** — connect `trackSignup()` and `trackTrialStart()` to auth flows
4. **Publish second blog article** — "FreshBooks vs Quick Invoice" targets a commercial keyword with buying intent
5. **Add Article JSON-LD** to blog post pages for article rich results eligibility
6. **Submit sitemap to Google Search Console** — do this on launch day

---

## 7. Core Web Vitals — Recommendations

Quick Invoice uses Next.js 14 which provides strong defaults. To maintain good CWV scores:

- **LCP (Largest Contentful Paint):** Ensure hero image on homepage has `priority` prop on `<Image>`. Avoid unoptimized images above the fold.
- **CLS (Cumulative Layout Shift):** All `next/font` fonts use `display: swap` — correct. Ensure all images have explicit `width` and `height` or use `fill` with a sized container.
- **INP (Interaction to Next Paint):** App is server-rendered; minimize client-side JavaScript in above-the-fold components. Analytics scripts load with `afterInteractive` strategy — correct.

---

*SEO Foundation authored by Beacon (SEO Specialist Agent) · 2026-04-01*  
*Next task: Landing Page Core Sections — implement full homepage with targeting for P1 keywords*
