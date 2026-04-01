# Build Fix Delegation — Quick Invoice Test 2

**Date:** 2026-04-01  
**Authored by:** Progenix (Chief of Staff)  
**Assigned to:** Software Engineer  
**Branch:** main

---

## Status

| Fix | File | Done By | Status |
|-----|------|---------|--------|
| Add `prisma generate` to build script | `package.json` | Chief of Staff | ✅ COMPLETE |
| Add `output: "standalone"` to Next config | `next.config.mjs` | Software Engineer | ⏳ PENDING |
| Fix module-level throw in stripe.ts | `src/lib/stripe.ts` | Software Engineer | ⏳ PENDING |
| Remove dead `onRequestError` export | `instrumentation.ts` | Software Engineer | ⏳ PENDING |
| Remove duplicate import in billing.ts | `src/lib/billing.ts` | Software Engineer | ⏳ PENDING |

---

## Fix 1 — ✅ COMPLETE: `package.json` build script

The `build` script was updated from:
```json
"build": "next build"
```
to:
```json
"build": "prisma generate && next build"
```

This resolves **Critical Finding #1** — Prisma-generated types missing at build time.  
Without this, TypeScript compilation fails with `TS2305: Module '"@prisma/client"' has no exported member 'User'` (and every other schema type).

---

## Fix 2 — ⏳ PENDING: `next.config.mjs` — Add `output: "standalone"`

**Severity:** HIGH  
**File:** `next.config.mjs`

Add `output: "standalone"` to the `nextConfig` object so the Dockerfile runner stage can copy `.next/standalone`:

```js
const nextConfig = {
  output: "standalone",   // ← ADD THIS LINE
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  // ... rest unchanged
};
```

---

## Fix 3 — ⏳ PENDING: `src/lib/stripe.ts` — Lazy initialization pattern

**Severity:** CRITICAL (runtime) / HIGH (build-time if STRIPE_SECRET_KEY not stubbed)  
**File:** `src/lib/stripe.ts`, lines 3–5

Replace the module-level throw pattern:
```ts
// BEFORE (breaks if env var not set at build time)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { ... });
export default stripe;
```

With a lazy initialization pattern:
```ts
// AFTER (safe at build time)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { ... });
  }
  return _stripe;
}
```

All callers currently using `import stripe from "@/lib/stripe"` must be updated to `import { getStripe } from "@/lib/stripe"` and call `getStripe()` instead of `stripe` directly.

**Alternatively** (simpler): ensure `STRIPE_SECRET_KEY=sk_test_placeholder` is set as an environment variable in the preview/CI build environment. This avoids code changes but requires infrastructure-level configuration.

---

## Fix 4 — ⏳ PENDING: `instrumentation.ts` — Remove dead export

**Severity:** LOW  
**File:** `instrumentation.ts`

Remove the Next.js 15-only export:
```ts
// REMOVE this line — it is dead code in Next.js 14.2.18
export { onRequestError } from "@sentry/nextjs";
```

---

## Fix 5 — ⏳ PENDING: `src/lib/billing.ts` — Remove duplicate import

**Severity:** LOW  
**File:** `src/lib/billing.ts`, line 29

The symbol `getPlanConfig` is both re-exported on line 10 and locally imported on line 29.  
Remove the redundant local import:
```ts
// REMOVE this line (line ~29) — already re-exported from line 10
import { getPlanConfig } from "@/lib/plans";
```

Keep only the re-export on line 10:
```ts
export { PLAN_CONFIGS, getPlanConfig } from "@/lib/plans";
```

---

## Notes for Software Engineer

- All changes target `main` branch directly — no feature branch needed per project config.
- After implementing Fix 3, grep for all `import stripe from "@/lib/stripe"` usages and update them to `getStripe()` if using the lazy pattern.
- Fixes 4 and 5 are cosmetic/low-risk — apply them last.
- After all fixes are applied, run `npm run build` to confirm exit code 0.
