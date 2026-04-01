# Build Fixes — Implementation Report

**Project:** Quick Invoice Test 2  
**Date:** 2026-04-01  
**Author:** Progenix Chief of Staff  
**Phase:** 2 — Fix build errors identified in Phase 1 audit  
**Status:** PARTIAL — CoS fix applied; code-level fixes delegated to Software Engineer

---

## Summary

One configuration fix was applied directly by the Chief of Staff. Two code-level fixes remain and are delegated to a Software Engineer per role constraints.

---

## Fix Applied (CoS Authority)

### ✅ Fix #1 — `package.json` build script updated

**Severity:** CRITICAL (was blocking ALL builds)  
**File:** `package.json`  
**Change:**

| Before | After |
|--------|-------|
| `"build": "next build"` | `"build": "prisma generate && next build"` |

**Why this fixes the build:**  
Without `prisma generate`, `node_modules/.prisma/client/` is never populated with schema-specific types. The `@prisma/client` package from npm contains only stubs. Every file that imports a Prisma model or enum (`User`, `Invoice`, `InvoiceStatus`, `Plan`, etc.) would emit `TS2305: Module '@prisma/client' has no exported member 'X'` — which aborts the TypeScript compilation step of `next build`. There are 10+ affected files across `src/types/`, `src/lib/`, and all API routes.

Adding `prisma generate` as a pre-step ensures the generated client is always present before Next.js compiles TypeScript.

---

## Remaining Fixes — Delegated to Software Engineer

The following require changes to `.ts` or `.mjs` source files, which are outside CoS authority.

---

### 🔧 Fix #2 — `next.config.mjs`: Add `output: "standalone"` (HIGH)

**File:** `next.config.mjs`  
**Severity:** HIGH — Docker deployment will fail at container start (standalone dir missing)  
**Does not block `npm run build`** itself, but prevents the Dockerfile runner stage from working.

**Required change** — add `output: "standalone"` to the `nextConfig` object:

```js
const nextConfig = {
  output: "standalone",   // ← ADD THIS LINE
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  images: { ... },
  experimental: { ... },
};
```

**Context:** The Dockerfile runner stage executes:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
```
Without `output: "standalone"` in `next.config.mjs`, Next.js does not generate `.next/standalone/` and the container exits immediately on startup.

---

### 🔧 Fix #3 — `src/lib/stripe.ts`: Replace module-level throw with lazy initialization (HIGH/CRITICAL)

**File:** `src/lib/stripe.ts`  
**Severity:** CRITICAL at runtime; HIGH at build time if `STRIPE_SECRET_KEY` is not set in the build environment  
**Current code (lines 3–5):**
```ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}
```

**Problem:** Module-level throws execute at import time. Any page that transitively imports this module during static rendering will crash the build with an unhandled error. While all current importers are API routes (which Next.js does not statically render), this is a fragile pattern that will fail if any import chain changes.

**Required change — replace with lazy initialization:**
```ts
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

export default getStripe();
```

> **Note:** If the `export default getStripe()` pattern breaks existing callers, the SE should audit all 6 import sites (`src/app/api/billing/checkout/route.ts`, `portal/route.ts`, `reactivate/route.ts`, `upgrade/route.ts`, `cancel/route.ts`, `src/app/api/webhooks/stripe/route.ts`) and update them to call `getStripe()` instead of using the default export directly — OR keep `export default stripe` pointing to a lazily-initialized singleton.

---

### 🔧 Fix #4 — `instrumentation.ts`: Remove Next.js 15-only dead export (LOW)

**File:** `instrumentation.ts`  
**Severity:** LOW — Does not break build; is dead code in Next.js 14.2.18  
**Line:** `export { onRequestError } from "@sentry/nextjs";`

`onRequestError` is a Next.js 15 instrumentation hook. It exists in `@sentry/nextjs` v8 types but will never be called by the framework in Next.js 14. Remove this line to avoid confusion.

---

### 🔧 Fix #5 — `src/lib/billing.ts`: Clean up duplicate import (LOW)

**File:** `src/lib/billing.ts`  
**Severity:** LOW — Does not break build; confusing code style  
**Issue:** `getPlanConfig` is both re-exported (line 10) and locally imported (line 29) from the same source. The local import is what functions inside `billing.ts` use; the re-export is for consumers.

Remove the redundant local `import { getPlanConfig } from "@/lib/plans"` on line 29 and rely on the already-available local binding. Alternatively, split the re-export and keep the import — but not both on separate lines without a comment explaining why.

---

## Build Verification

After the Software Engineer applies fixes #2 and #3, a build verification run is required:

```bash
# In the project root with all env vars set (DATABASE_URL, STRIPE_SECRET_KEY, NEXTAUTH_SECRET):
npm run build
# Expected: exit code 0
```

The Stripe issue (#3) can be tested without a real key:
```bash
STRIPE_SECRET_KEY=sk_test_placeholder npm run build
```

---

## Risk Assessment

| Fix | Without Fix | With Fix |
|-----|-------------|----------|
| #1 (prisma generate) ✅ DONE | Build aborts with TS2305 on all @prisma/client imports | Build proceeds past TypeScript compilation |
| #2 (output: standalone) | Docker container fails to start | Docker deployment works |
| #3 (stripe lazy init) | Build fails if STRIPE_SECRET_KEY unset; fragile import chain | Build is env-var-safe; runtime error only when Stripe is actually called |
| #4 (instrumentation dead code) | Dead code present | Clean code |
| #5 (billing duplicate import) | Confusing but functional | Clean code |

---

*Generated by Progenix Chief of Staff — 2026-04-01*
