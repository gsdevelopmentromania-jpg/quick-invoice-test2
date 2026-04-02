# Code Review — Quick Invoice

**Reviewer:** Chief of Staff (AI Agent)
**Date:** 2026-04-02
**Scope:** Full codebase final quality review
**Verdict:** ⚠️ **Conditional Pass — 1 critical issue must be fixed before launch**

---

## Overall Score: 7.5 / 10

| Category | Score | Notes |
|---|---|---|
| Architecture Consistency | 8/10 | Follows `docs/architecture.md` well; some DAL bypass |
| Security | 6/10 | Strong foundations, but critical password hash leak |
| Code Quality (DRY) | 7/10 | Duplicate Zod schemas across files |
| Error Handling | 8/10 | Consistent patterns, proper catch blocks |
| Type Safety | 8/10 | Strict mode enabled, good typing throughout |
| Database Design | 9/10 | Money in cents, proper indexes, cascade deletes |
| Authentication | 9/10 | Rate-limited, enumeration-safe, bcrypt(12) |

---

## 🔴 Critical Issues (Must Fix)

### 1. Password Hash Exposed in Profile API Response

**File:** `src/app/api/user/profile/route.ts` (GET handler)
**Severity:** 🔴 CRITICAL

The `GET /api/user/profile` endpoint returns the full Prisma `User` object, which includes the `passwordHash` field. This field is sent directly to the client browser.

```typescript
// Current (INSECURE):
const user = await prisma.user.findUnique({ where: { id: session.user.id } });
return NextResponse.json({ data: user }); // ← includes passwordHash!
```

The `UserSafe` type alias in `src/types/index.ts` is defined as `Omit<User, never>`, which does not actually omit anything — it equals `User`. This is misleading.

**Recommended fix:**
- Change the query to use `select` and explicitly exclude `passwordHash`.
- Fix `UserSafe` to `Omit<User, 'passwordHash'>`.

---

## 🟠 High-Severity Issues

### 2. Duplicate Zod Validation Schemas

**Files:** `src/lib/schemas.ts` vs. `src/app/api/invoices/route.ts`, `src/app/api/clients/route.ts`, `src/app/api/clients/[id]/route.ts`
**Severity:** 🟠 HIGH

Centralized schemas exist in `src/lib/schemas.ts` (with proper length limits and detailed error messages), but the API route handlers redefine their own inline schemas. The inline versions are less strict — they lack `.max()` limits on string fields that the centralized versions enforce (e.g., 500-char description limit, 200-char name limit).

This creates two sources of truth that can drift apart and means the stricter client-side validation is bypassed on the server.

**Recommended fix:** Route handlers should import and use schemas from `src/lib/schemas.ts`.

### 3. Two Conflicting Account Deletion Endpoints

**Files:** `src/app/api/user/profile/route.ts` (DELETE) and `src/app/api/user/delete/route.ts` (DELETE)
**Severity:** 🟠 HIGH

Two separate endpoints handle account deletion with different confirmation mechanisms:
- `DELETE /api/user/profile` requires `{ confirmEmail: "user@example.com" }`
- `DELETE /api/user/delete` requires `{ confirmation: "DELETE MY ACCOUNT", password: "..." }`

This is confusing for frontend developers and could lead to inconsistent behavior. Only one canonical endpoint should exist.

---

## 🟡 Medium-Severity Issues

### 4. API Routes Bypass the DAL Layer

**Files:** `src/app/api/invoices/route.ts`, `src/app/api/clients/route.ts`
**Severity:** 🟡 MEDIUM

The architecture document specifies: *"API routes call DAL functions rather than writing raw Prisma queries inline."* However, the main invoices and clients route handlers contain inline Prisma queries instead of calling `src/lib/dal/invoices.ts` and `src/lib/dal/clients.ts`.

A complete DAL exists with equivalent functions (`listInvoices`, `createInvoice`, `listClients`, `createClient`), but the routes don't use them.

### 5. HTML Email Templates Lack Input Sanitization

**File:** `src/lib/email.ts`
**Severity:** 🟡 MEDIUM

Email HTML is constructed via template literals with direct string interpolation of user-supplied data (client names, invoice numbers, sender names). While email clients typically don't execute JavaScript, malicious HTML tags in client names could distort the email layout or be used in phishing.

```typescript
<h2>Invoice ${invoice.invoiceNumber} from ${senderName}</h2>
<p>Hi ${invoice.client.name},</p>
```

**Recommended fix:** Escape HTML entities in user-supplied strings before interpolation.

### 6. Inconsistent Pagination API Shape

**Files:** `src/app/api/invoices/route.ts` vs. `src/app/api/clients/route.ts`
**Severity:** 🟡 MEDIUM

- Invoices route uses query param `limit` and returns `{ data, total, page, limit }`.
- Clients route uses query param `pageSize` and returns `{ data, total, page, pageSize, totalPages, limit }`.

Frontend consumers must handle two different pagination shapes. Standardize on one.

---

## 🟢 Low-Severity / Informational

### 7. In-Memory Rate Limiter

**File:** `src/lib/rate-limit.ts`

The rate limiter uses an in-memory `Map`. This is explicitly documented as a limitation. For multi-instance or serverless deployments, this provides no protection. The code comments suggest Redis (Upstash) as the production replacement. Acceptable for v0.1.0 launch.

### 8. Invoice Number Race Condition

**Files:** `src/app/api/invoices/route.ts`, `src/lib/dal/invoices.ts`

Invoice numbers are generated via `count + 1`. Under concurrent requests, two invoices could attempt the same number. The `@@unique([userId, invoiceNumber])` Prisma constraint prevents data corruption, but one request would fail with an opaque error. The DAL comments acknowledge this. Consider a database sequence for production scale.

### 9. Duplicate Import Pattern in billing.ts

**File:** `src/lib/billing.ts`

`getPlanConfig` is re-exported on line 10 (`export { getPlanConfig } from "@/lib/plans"`) and imported again on line 36 (`import { getPlanConfig } from "@/lib/plans"`). While not a bug (re-exports don't create local bindings), it's unusual and could confuse future maintainers.

---

## ✅ What's Done Well

- **Authentication** — NextAuth.js v4 with JWT, bcrypt(12), rate-limited login attempts, user enumeration prevention on registration and forgot-password.
- **Authorization** — Every API route checks `session.user.id`; all database queries are scoped to the authenticated user. Middleware protects dashboard and API routes.
- **Input Validation** — Zod schemas validate all API inputs with `safeParse()`.
- **Money Handling** — All monetary values stored as integer cents; `dollarsToCents`/`centsToDollars` helpers used consistently.
- **Stripe Webhook Security** — Signature verification with `constructEvent()` before processing.
- **GDPR Compliance** — Account deletion with cascade deletes, email verification flow.
- **Database Design** — Proper indexes, foreign key constraints, cascade deletes, unique constraints.
- **Monitoring** — Sentry integration, structured JSON logger, health endpoint with dependency checks.
- **Docker** — Multi-stage build, non-root user, standalone output.
- **Environment Safety** — `.env.example` with placeholders only, `.gitignore` excludes all `.env*` files, Stripe key gracefully handles missing value at build time.
- **Public Invoice Page** — `robots: { index: false }` prevents indexing, CUID-based IDs provide sufficient entropy.

---

## Recommendation

**Do not ship until Critical Issue #1 (password hash leak) is fixed.** All other issues are non-blocking for an initial v0.1.0 launch but should be addressed in the next sprint.

Priority order for fixes:
1. 🔴 Fix password hash exposure (Critical #1)
2. 🟠 Consolidate Zod schemas (High #2)
3. 🟠 Remove duplicate deletion endpoint (High #3)
4. 🟡 Migrate route handlers to use DAL (Medium #4)
5. 🟡 Sanitize email template inputs (Medium #5)
6. 🟡 Standardize pagination API shape (Medium #6)
