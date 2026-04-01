# Build Failure Audit Report

**Project:** Quick Invoice Test 2  
**Date:** 2026-04-01  
**Auditor:** Progenix Chief of Staff  
**Status:** PREVIEW FAILED — root causes identified

---

## Executive Summary

The preview build failure is caused by **one critical environment issue** and **one critical module-level code error**, plus several secondary risks. No syntax errors were found in the TypeScript/TSX source files themselves — the codebase is structurally sound. The failures are infrastructure and environment related.

---

## Critical Finding #1 — Missing `prisma generate` in Preview Build

**Severity: CRITICAL — This alone will abort the build.**

**Root Cause:**  
The Dockerfile correctly runs `npx prisma generate` in its deps stage before `npm run build`. However, the preview/CI platform appears to run `npm install && next build` without executing `prisma generate` first.

Without `prisma generate`, the `node_modules/.prisma/client/` directory is never populated with schema-specific types. The `@prisma/client` package installed from npm only contains stub types. Every import of a schema model or enum will fail at TypeScript compilation time.

**Affected files (every file that imports from `@prisma/client`):**

| File | Failing Imports |
|------|----------------|
| `src/types/index.ts` | `Invoice`, `LineItem`, `Client`, `User`, `InvoiceStatus`, `Plan`, `PaymentStatus`, `SubscriptionStatus` |
| `src/lib/auth.ts` | `NextAuthOptions` uses Prisma adapter; `PrismaClient` instantiation |
| `src/lib/prisma.ts` | `PrismaClient` |
| `src/lib/plans.ts` | `Plan` (type import) |
| `src/lib/billing.ts` | `Plan` |
| `src/lib/dal/billing.ts` | `Subscription` |
| `src/lib/dal/clients.ts` | `Client` |
| `src/lib/dal/users.ts` | `User` |
| `src/lib/dal/invoices.ts` | (transitively via `@/types`) |
| `src/app/api/webhooks/stripe/route.ts` | `SubscriptionStatus`, `Plan` |
| `src/app/api/billing/subscription/route.ts` | `Plan`, `SubscriptionStatus` |
| All API routes (transitively via `@/types`) | Multiple |

**Expected TypeScript errors (representative sample):**
```
error TS2305: Module '"@prisma/client"' has no exported member 'User'.
error TS2305: Module '"@prisma/client"' has no exported member 'Invoice'.
error TS2305: Module '"@prisma/client"' has no exported member 'InvoiceStatus'.
error TS2305: Module '"@prisma/client"' has no exported member 'Plan'.
error TS2305: Module '"@prisma/client"' has no exported member 'SubscriptionStatus'.
```

**Fix Required:**  
The preview/CI build script must run `npx prisma generate` before `next build`. Add to the build command:
```
npx prisma generate && next build
```

Or update `package.json` build script:
```json
"build": "prisma generate && next build"
```

---

## Critical Finding #2 — Module-Level Throw in `src/lib/stripe.ts`

**Severity: CRITICAL at runtime; HIGH during build if env var is not stubbed.**

**File:** `src/lib/stripe.ts`, lines 3–5

```ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}
```

**Analysis:**  
The Dockerfile correctly stubs this: `ENV STRIPE_SECRET_KEY=sk_test_placeholder`. However, if the preview environment does NOT set `STRIPE_SECRET_KEY` before running the build:

1. At **build time**: For any page that statically imports this module (not just API routes), this throw will crash the build. Webpack/Next.js evaluates module-level code when statically rendering pages.
2. At **runtime**: Even if the build passes, the application will throw on first stripe module load.

Files that directly import `src/lib/stripe.ts`:
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/billing/reactivate/route.ts`
- `src/app/api/billing/upgrade/route.ts`
- `src/app/api/billing/cancel/route.ts`
- `src/app/api/webhooks/stripe/route.ts`

**Fix Required:**  
Either ensure `STRIPE_SECRET_KEY` is set (even as a placeholder like `sk_test_placeholder`) in the build environment, OR refactor `src/lib/stripe.ts` to use a lazy initialization pattern instead of a module-level throw.

---

## High Finding #3 — `next.config.mjs` Missing `output: "standalone"` for Preview

**Severity: HIGH — Required for the Dockerfile runner stage.**

**File:** `next.config.mjs`

The Dockerfile's runner stage copies `.next/standalone`:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
```

But `next.config.mjs` does NOT include `output: "standalone"`. Without this, Next.js does not generate the standalone output directory, and the container will fail to start even if the build succeeds.

**Fix Required:**  
Add to `next.config.mjs`:
```js
const nextConfig = {
  output: "standalone",  // ← ADD THIS
  pageExtensions: [...],
  ...
};
```

---

## Medium Finding #4 — Missing Environment Variables at Build Time

**Severity: MEDIUM — Some may cause TypeScript/lint warnings; none are fatal if stubbed.**

The Dockerfile uses `ARG`/`ENV` for these vars but if the preview platform does not pass them, they will be empty:

| Variable | Usage | Risk if empty at build |
|----------|-------|----------------------|
| `DATABASE_URL` | Prisma runtime | Low (only needed at query time, not build time) |
| `NEXTAUTH_SECRET` | next-auth JWT signing | Low (only needed at runtime) |
| `NEXTAUTH_URL` | next-auth redirect | Low (only needed at runtime) |
| `NEXT_PUBLIC_APP_URL` | Used in metadata and SEO | Low (fallback `https://quickinvoice.app` is hardcoded) |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload | Low (Sentry config is `silent: !process.env.CI`) |

---

## Low Finding #5 — `onRequestError` Export in `instrumentation.ts` (Next.js 15 Only)

**Severity: LOW — Will not break Next.js 14 build but is dead code.**

**File:** `instrumentation.ts`, line 11

```ts
export { onRequestError } from "@sentry/nextjs";
```

`onRequestError` is a Next.js 15 instrumentation hook. In Next.js 14.2.18 (this project), this export is valid TypeScript (it exists in `@sentry/nextjs` v8) but will never be called by the framework. It is harmless dead code but should be noted for cleanup.

---

## Low Finding #6 — Duplicate `getPlanConfig` Import/Export in `src/lib/billing.ts`

**Severity: LOW — TypeScript allows this pattern; not a compile error.**

**File:** `src/lib/billing.ts`, lines 10 and 29

```ts
// Line 10 (re-export)
export { PLAN_CONFIGS, getPlanConfig } from "@/lib/plans";

// Line 29 (local import)
import { getPlanConfig } from "@/lib/plans";
```

TypeScript permits both a re-export and a local import of the same symbol because the re-export does not create a local binding. This is functionally correct but is confusing code style. The local `import` on line 29 is what the functions inside `billing.ts` use; the `export` on line 10 re-exports it for consumers of `billing.ts`. No TypeScript error, but flagged for clarity.

---

## Confirmed No-Issues (Verified by Review)

The following were audited and confirmed clean:

- ✅ `src/app/layout.tsx` — All imports resolve correctly (`Providers`, `Analytics`, `JsonLd` all exist with correct exports)
- ✅ `src/app/page.tsx` — All `JsonLd` type imports (`OrganizationJsonLd`, `WebSiteJsonLd`, `SoftwareApplicationJsonLd`, `FaqJsonLd`) are correctly exported from `src/components/seo/json-ld.tsx`
- ✅ `src/components/providers.tsx` — Correct `"use client"` directive; `SessionProvider` import valid
- ✅ `src/components/analytics/analytics.tsx` — No client hooks; uses `Script` from next correctly
- ✅ `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — All three files exist; `Sentry.prismaIntegration()` is valid in `@sentry/nextjs` v8
- ✅ `instrumentation.ts` — Exists; `register()` export and Sentry dynamic imports are correct
- ✅ `next.config.mjs` — `serverComponentsExternalPackages` is valid in Next.js 14.2.18 (it was renamed to `serverExternalPackages` only in Next.js 15); MDX config is correct
- ✅ `prisma/schema.prisma` — Valid schema; all models and enums referenced in code are defined
- ✅ `src/middleware.ts` — Correct `withAuth` usage; matcher config is valid
- ✅ All UI components (`Badge`, `Button`, `Card`, `EmptyState`) — Exports match all usage patterns found in pages
- ✅ `src/lib/utils.ts` — `cn`, `formatCurrency`, `formatDate` exports match all import sites
- ✅ `src/lib/errors.ts` — All error helpers (`unauthorized`, `badRequest`, `serverError`, etc.) exist as named exports; all import sites reference them correctly
- ✅ MDX blog pages — `JsonLd` import is present; `articleSchema` objects have all required `ArticleJsonLd` fields
- ✅ `mdx-components.tsx` — `useMDXComponents` export is correct for `@next/mdx`
- ✅ `src/types/index.ts` — `dollarsToCents` and `centsToDollars` exported; `InvoiceTotals` type exported; all used correctly in `src/lib/dal/invoices.ts`
- ✅ Dockerfile — Runs `prisma generate` before `next build` and stubs `STRIPE_SECRET_KEY`

---

## Priority Fix Order

| # | Finding | File(s) | Effort |
|---|---------|---------|--------|
| 1 | Add `prisma generate` to build command | `package.json` (build script) | 1 line |
| 2 | Stub `STRIPE_SECRET_KEY` in preview env OR refactor stripe.ts | Preview env config OR `src/lib/stripe.ts` | Small |
| 3 | Add `output: "standalone"` to next.config.mjs | `next.config.mjs` | 1 line |
| 4 | Remove dead `onRequestError` export | `instrumentation.ts` | 1 line |
| 5 | Clean up duplicate import in billing.ts | `src/lib/billing.ts` | 1 line |

---

*This report was generated by static analysis of all source files. A live `npm run build` could not be executed in this environment. The findings above are based on code review and cross-referencing all import/export chains.*
