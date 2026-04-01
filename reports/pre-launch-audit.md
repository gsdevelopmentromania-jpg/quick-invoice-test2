# Pre-Launch Security & Quality Audit — Quick Invoice

**Project:** Quick Invoice Test 2  
**Audited by:** Aegis (QA Manager)  
**Date:** 2026-04-01  
**Branch:** `playbook/saas-mvp-from-scratch-cfaa4039`

---

## Executive Summary

The codebase is generally well-structured with solid patterns: Zod validation on all inputs, Prisma ORM (no raw SQL), bcrypt-12 password hashing, NextAuth JWT sessions, Stripe webhook signature verification, and GDPR-compliant account deletion. However, **two critical vulnerabilities** must be fixed before launch, along with several high-severity issues that present meaningful risk under production load.

**Overall Risk Rating: 🔴 HIGH — Not ready for launch until P0/P1 issues are resolved.**

---

## Findings by Severity

### 🔴 P0 — Critical (Block Launch)

---

#### [SEC-001] `UserSafe` type exposes `passwordHash` to clients

**File:** `src/types/index.ts`, `src/app/api/user/profile/route.ts`  
**CVSS-like severity:** Critical

**Details:**  
The type alias `UserSafe = Omit<User, never>` omits **nothing** — `never` is an empty set, so this is identical to the full `User` type. The Prisma `User` model includes a `passwordHash` field (confirmed in `prisma/schema.prisma`). The `GET /api/user/profile` handler fetches the full user row and returns it as `UserSafe`, broadcasting the bcrypt password hash to the authenticated client.

```typescript
// src/types/index.ts — CURRENT (BROKEN)
export type UserSafe = Omit<User, never>; // Nothing is omitted!

// Prisma User model includes:
// passwordHash     String?
// stripeCustomerId String?   @unique
// planExpiresAt    DateTime?
```

While bcrypt hashes are not reversible in normal operation, exposing them:
- Enables offline dictionary/rainbow-table attacks if the hash is captured
- Leaks `stripeCustomerId` and internal billing metadata to the frontend
- Violates the principle of least privilege

**Fix:**
```typescript
export type UserSafe = Omit<User, "passwordHash" | "stripeCustomerId">;
```
The profile API handler must also strip these fields explicitly since TypeScript types don't filter runtime values — use `select` in the Prisma query or destructure and omit manually.

**Recommended fix in `src/app/api/user/profile/route.ts`:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: {
    id: true, email: true, emailVerified: true,
    fullName: true, businessName: true, businessAddress: true,
    businessPhone: true, logoUrl: true, currency: true,
    locale: true, plan: true, planExpiresAt: true,
    createdAt: true, updatedAt: true,
    // passwordHash and stripeCustomerId excluded
  },
});
```

---

#### [SEC-002] Missing HTTP Security Headers

**File:** `next.config.mjs`  
**CVSS-like severity:** Critical

**Details:**  
The `next.config.mjs` contains zero HTTP security headers. Every response from the app is missing:

| Header | Risk Without It |
|--------|----------------|
| `Content-Security-Policy` | XSS attacks can execute injected scripts |
| `Strict-Transport-Security` | SSL stripping / downgrade attacks |
| `X-Frame-Options` | Clickjacking attacks |
| `X-Content-Type-Options` | MIME sniffing attacks |
| `Referrer-Policy` | Password reset tokens leak via Referer headers to analytics |
| `Permissions-Policy` | Unrestricted camera/mic/geolocation access |

Without CSP, any XSS vector (including third-party scripts from GA4, PostHog, Plausible) has unrestricted access to the DOM and can exfiltrate session cookies/tokens.

**Fix** — add `headers()` to `next.config.mjs`:
```javascript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://plausible.io https://app.posthog.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' https://api.stripe.com https://app.posthog.com https://plausible.io",
            "frame-src https://js.stripe.com https://hooks.stripe.com",
          ].join("; "),
        },
      ],
    },
  ];
},
```

---

### 🟠 P1 — High (Fix Before Launch)

---

#### [SEC-003] In-Memory Rate Limiter Ineffective in Serverless

**File:** `src/lib/rate-limit.ts`  
**Severity:** High

**Details:**  
The rate limiter uses a Node.js `Map` stored in module memory:
```typescript
const store = new Map<string, RateLimitEntry>();
```

In serverless/edge deployments (Vercel, AWS Lambda), each cold start creates a new process with an empty map. Under load, many concurrent function instances run in parallel — each with their own empty store. An attacker can trivially bypass login brute-force protection and signup rate limits by simply making many concurrent requests.

**Affected endpoints:**
- `POST /api/auth/register` — 5 signups/IP/hour (bypassable)
- `POST /api/auth/forgot-password` — rate limited (bypassable)
- `POST /api/auth/reset-password` — 10 attempts/IP/hour (bypassable)
- Login via NextAuth credentials — 5 attempts/email/15min (bypassable)

**Fix:** Replace the in-memory store with Redis (Upstash is recommended for serverless — it has a free tier and zero infrastructure). The rate-limit module is already designed for this swap:

```typescript
// Replace Map with Upstash Redis:
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();

export async function checkRateLimit(identifier: string, limit: number, windowSeconds: number) {
  const key = `rl:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  const remaining = Math.max(0, limit - count);
  return { success: count <= limit, remaining, resetIn: windowSeconds };
}
```

Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example`.

---

#### [SEC-004] HTML Injection in Email Templates

**File:** `src/lib/email.ts`  
**Severity:** High

**Details:**  
User-supplied data is interpolated directly into HTML strings in the email templates with no escaping:

```typescript
// Line item description — attacker can inject HTML:
`<td>${item.description}</td>`

// Sender name — attacker can inject links/scripts:
`<h2>Invoice ${invoice.invoiceNumber} from ${senderName}</h2>`

// Payment URL is rendered as an unsanitized href:
`<a href="${paymentUrl}" ...>Pay Now</a>`
```

If a user sets their `businessName` or a line item `description` to contain `<script>` or `<img onerror="...">`, that HTML will be rendered in the recipient's email client. Sophisticated email clients that render HTML (and some preview panes) may execute injected scripts. More practically, an attacker can inject convincing phishing links into legitimate-looking invoices.

**Fix:** Add a simple HTML escape helper and apply it to all user-sourced values:

```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// Usage: escapeHtml(item.description), escapeHtml(senderName), etc.
```

For `paymentUrl`, validate it is a `https://` URL before rendering it as an href.

---

#### [SEC-005] `/api/billing/*` Routes Not Protected by Edge Middleware

**File:** `src/middleware.ts`  
**Severity:** High

**Details:**  
The middleware `matcher` config protects API routes for invoices, clients, and user — but **not billing**:

```typescript
// Current matcher — billing is missing:
"/api/invoices/:path*",
"/api/clients/:path*",
"/api/user/:path*",
// "/api/billing/:path*" ← NOT INCLUDED
```

While each billing route performs its own `getServerSession()` check, omitting billing routes from the middleware means:
1. Unauthenticated requests hit the full Next.js runtime (no edge-level short-circuit)
2. Any future billing route added by a developer may accidentally skip its own auth check with no middleware safety net
3. Inconsistency creates confusion about the auth model

**Fix:**
```typescript
export const config = {
  matcher: [
    // ... existing entries ...
    "/api/billing/:path*",
  ],
};
```

---

#### [SEC-006] Invoice Number Generation Has Race Condition

**File:** `src/app/api/invoices/route.ts`  
**Severity:** High

**Details:**  
Invoice numbers are generated with a non-atomic count query:
```typescript
const count = await prisma.invoice.count({ where: { userId: session.user.id } });
const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;
```

Two concurrent `POST /api/invoices` requests from the same user will both read the same `count` and produce the same invoice number (e.g., both `INV-0005`). The schema has `@@unique([userId, invoiceNumber])` which will cause a Prisma P2002 constraint error on the second insert — resulting in an unhandled 500 error for the user.

**Fix:** Use a database sequence or atomic upsert. Simplest approach — wrap in a retry loop catching P2002, or use a DB-level sequence:

```typescript
// Option A: Catch constraint violation and retry with count+2, etc.
// Option B: Use a separate invoice counter table with atomic increment
// Option C: Use UUID-based invoice numbers with user-friendly display aliases
```

---

### 🟡 P2 — Medium (Fix in First Patch Release)

---

#### [SEC-007] Password Reset Does Not Invalidate Existing Sessions

**File:** `src/app/api/auth/reset-password/route.ts`  
**Severity:** Medium

**Details:**  
When a user resets their password (e.g., after an account compromise), all existing JWT sessions remain valid for up to 30 days. An attacker who has obtained a session token retains access even after the victim changes their password.

**Fix:** Store a `passwordChangedAt` timestamp on the User model and validate it in the JWT callback:
```typescript
// In authOptions callbacks.jwt:
if (token.passwordChangedAt && user.passwordChangedAt > token.iat * 1000) {
  return null; // Invalidate token
}
```

---

#### [SEC-008] JWT Session Expiry Set to 30 Days

**File:** `src/lib/auth.ts`  
**Severity:** Medium

**Details:**  
```typescript
session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 } // 30 days
```

A 30-day non-revocable JWT is a wide attack window if a token is stolen. Industry standard for financial/invoice SaaS is 7–14 days with sliding expiry, or 1-hour access tokens + refresh tokens.

**Fix:** Reduce to 7 days: `maxAge: 7 * 24 * 60 * 60`.

---

#### [SEC-009] `logoUrl` Accepts Arbitrary HTTPS URLs

**File:** `src/app/api/user/profile/route.ts`  
**Severity:** Medium

**Details:**  
```typescript
logoUrl: z.string().url().optional()
```

The `logoUrl` field accepts any `https://` URL. If the app ever renders this URL server-side (e.g., in PDF generation via `@react-pdf/renderer`), it becomes an SSRF (Server-Side Request Forgery) vector — an attacker could set it to `https://169.254.169.254/latest/meta-data/` (AWS IMDS) or internal network addresses.

**Fix:** Restrict to known storage domains:
```typescript
logoUrl: z.string().url().refine(
  (url) => url.startsWith("https://") &&
    (url.includes(".supabase.co") || url.includes("quickinvoice.app")),
  "Logo must be hosted on an approved domain"
).optional(),
```

---

#### [SEC-010] Email Verification Token Exposed in URL Query Parameter

**File:** `src/app/api/auth/register/route.ts`  
**Severity:** Medium

**Details:**  
```typescript
const verificationUrl = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
```

Verification tokens appear in URL query parameters. These URLs are logged by:
- Server access logs
- Browser history
- Referrer headers sent to analytics (GA4, PostHog, Plausible)
- CDN/proxy logs

With `Referrer-Policy: strict-origin-when-cross-origin` (from SEC-002 fix) the risk is reduced. Optionally move token to a `POST` body or fragment (`#token=...`) to mitigate further.

---

#### [QUAL-001] `trial_will_end` Webhook Handler is a TODO

**File:** `src/app/api/webhooks/stripe/route.ts`  
**Severity:** Medium

**Details:**  
```typescript
case "customer.subscription.trial_will_end": {
  // TODO: send trial-ending email via @/lib/email
  break;
}
```

This is a revenue-critical feature. Users on trial who don't get a warning email are more likely to churn. Must be implemented before launch.

---

### 🔵 P3 — Low (Backlog)

---

#### [SEC-011] Password Strength Validation is Minimal

**File:** `src/app/api/auth/register/route.ts`  
**Severity:** Low

The password policy only enforces `min(8)`. Consider adding complexity requirements or a zxcvbn strength score check to prevent weak passwords like `password1`.

---

#### [SEC-012] No CORS Configuration

**File:** `src/middleware.ts`, `next.config.mjs`  
**Severity:** Low

API routes do not set explicit CORS headers. While Next.js API routes aren't accessible cross-origin by default (browser same-origin policy applies), adding explicit CORS headers (`Access-Control-Allow-Origin: https://quickinvoice.app`) hardens against misconfiguration and documents the intent.

---

#### [QUAL-002] Concurrent Request Test Coverage Missing

**Files:** `src/__tests__/api/*.test.ts`  
**Severity:** Low

No test covers the invoice number race condition (SEC-006) or concurrent client/invoice creation. A test simulating two simultaneous `POST /api/invoices` requests would catch the P2002 error before production.

---

#### [QUAL-003] `DIRECT_URL` Missing from Schema Validation

**File:** `.env.example`  
**Severity:** Low

The `.env.example` documents `DIRECT_URL` as required for Supabase migrations, but there's no startup validation that ensures it is set. A missing `DIRECT_URL` will cause `prisma migrate deploy` to fail silently in CI if not caught.

---

#### [A11Y-001] Email Templates Use Layout Tables

**File:** `src/lib/email.ts`  
**Severity:** Low

Invoice emails use `<table border="1">` for layout. While common in email HTML, `role="presentation"` should be added to layout tables and `scope="col"` to header cells for screen-reader accessibility in email clients that support ARIA.

---

#### [PERF-001] Bundle Size — No Static Analysis Performed

**Severity:** Low — Informational

A full Lighthouse audit requires a running instance. Based on static analysis:
- `@react-pdf/renderer` is a heavy dependency (~2MB). Verify it is only loaded in server components / API routes and never imported into client bundles.
- PostHog, GA4, and Plausible are all loaded simultaneously. Consider loading only one analytics provider to reduce the JS payload.
- `zustand` is imported but no stores were found — verify it is still needed or remove it.

---

#### [MOB-001] Mobile Testing — Manual Verification Required

**Severity:** Low — Informational

No automated mobile tests exist. Before launch, manually verify on:
- **iOS Safari 17+** — test invoice PDF download, Stripe checkout, form inputs
- **Android Chrome 120+** — test same flows
- Specifically check `<input type="date">` pickers on mobile (known inconsistencies with `react-hook-form` date validation across iOS/Android)

---

#### [ENV-001] Staging / Production Parity

**Severity:** Low — Informational

No staging environment is defined in CI (`github-workflows/deploy.yml`). Before launch:
- Verify `NEXTAUTH_URL` is set to the production domain (common misconfiguration)
- Verify `STRIPE_SECRET_KEY` uses `sk_live_` in production (not `sk_test_`)
- Verify `STRIPE_WEBHOOK_SECRET` matches the production Stripe endpoint secret
- The `next.config.mjs` `remotePatterns` allows GitHub and Google avatar hosts — verify these cover all OAuth providers in production

---

## Dependency Audit Summary

Run `npm audit` in CI before launch. Packages to monitor:

| Package | Version | Watch For |
|---------|---------|-----------|
| `next` | 14.2.18 | Latest: check for security patches in 14.x series |
| `next-auth` | ^4.24.11 | v4 is in maintenance; v5 (Auth.js) is the successor |
| `@prisma/client` | ^5.22.0 | No known critical CVEs at audit date |
| `nodemailer` | ^6.9.16 | Verify SMTP credential handling in production config |
| `stripe` | ^17.3.1 | Up to date |
| `bcryptjs` | ^2.4.3 | Stable; consider `argon2` for new projects |

**Recommended additions:**
- `helmet` or equivalent headers middleware (though Next.js `headers()` config is sufficient)
- `@upstash/redis` for production-grade rate limiting (see SEC-003)

---

## Prioritised Task List

| ID | Issue | Severity | Estimated Effort |
|----|-------|----------|-----------------|
| SEC-001 | `UserSafe` exposes `passwordHash` / `stripeCustomerId` | 🔴 P0 | 30 min |
| SEC-002 | Missing HTTP security headers | 🔴 P0 | 1 hour |
| SEC-003 | In-memory rate limiter (Upstash Redis) | 🟠 P1 | 2 hours |
| SEC-004 | HTML injection in email templates | 🟠 P1 | 1 hour |
| SEC-005 | Add `/api/billing/*` to middleware matcher | 🟠 P1 | 15 min |
| SEC-006 | Invoice number race condition | 🟠 P1 | 2 hours |
| QUAL-001 | Implement trial-ending email | 🟡 P2 | 2 hours |
| SEC-007 | Invalidate sessions on password reset | 🟡 P2 | 3 hours |
| SEC-008 | Reduce JWT session to 7 days | 🟡 P2 | 15 min |
| SEC-009 | Restrict `logoUrl` to approved domains | 🟡 P2 | 30 min |
| SEC-010 | Email verification token in URL | 🟡 P2 | 1 hour |
| SEC-011 | Stronger password policy | 🔵 P3 | 1 hour |
| SEC-012 | Explicit CORS configuration | 🔵 P3 | 30 min |
| QUAL-002 | Concurrent request test coverage | 🔵 P3 | 2 hours |
| QUAL-003 | `DIRECT_URL` startup validation | 🔵 P3 | 30 min |
| A11Y-001 | Email table ARIA attributes | 🔵 P3 | 30 min |
| PERF-001 | Bundle size analysis + zustand audit | 🔵 P3 | 1 hour |
| MOB-001 | Manual iOS/Android QA pass | 🔵 P3 | 4 hours |
| ENV-001 | Staging/production parity checklist | 🔵 P3 | 2 hours |

---

## What Passed ✅

These areas are well-implemented and require no changes:

- ✅ **SQL Injection** — Prisma ORM with parameterized queries throughout; no raw SQL
- ✅ **Password hashing** — bcrypt with cost factor 12 (strong)
- ✅ **User enumeration protection** — Registration returns same response for existing emails
- ✅ **Stripe webhook verification** — `stripe.webhooks.constructEvent()` signature check before processing
- ✅ **Input validation** — Zod schemas on all API inputs (invoices, clients, auth, profile)
- ✅ **Authorisation scoping** — All data queries filter by `userId: session.user.id` (tenant isolation correct)
- ✅ **GDPR account deletion** — Password confirmation + cascade delete implemented
- ✅ **Error handling** — Consistent `ApiError` / `withErrorHandler` pattern; no stack traces in responses
- ✅ **Secrets management** — `.gitignore` excludes `.env.local`; `.env.example` uses placeholder values only
- ✅ **CSRF** — NextAuth uses `SameSite=Lax` cookies by default; App Router API routes are not affected by traditional CSRF
- ✅ **CI pipeline** — Lint, type-check, test, and build jobs present in `github-workflows/ci.yml`
- ✅ **Password reset token single-use** — `usedAt` field prevents token replay attacks
- ✅ **Plan-based feature gating** — Invoice and client limits enforced server-side

---

*Audit performed via static analysis of source code. Dynamic testing (Lighthouse, mobile, concurrent load) requires a running instance and should be performed in staging before production launch.*
