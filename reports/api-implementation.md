# API Implementation Report

**Project:** Quick Invoice Test 2  
**Phase:** Core MVP Build — Data Model & API Implementation  
**Date:** 2026-04-01  
**Author:** Core (Backend Engineer Agent)

---

## Summary

This report documents the complete data layer and API implementation for Quick Invoice Test 2, a SaaS invoicing platform built with Next.js 14 (App Router), Prisma ORM, PostgreSQL, and NextAuth.

---

## 1. Database Schema

**File:** `prisma/schema.prisma`  
**Migration:** `prisma/migrations/20260101000000_init/migration.sql`

### Tables

| Table | Description |
|---|---|
| `users` | Business owners; references Supabase auth UUID |
| `accounts` | NextAuth OAuth accounts |
| `sessions` | NextAuth sessions |
| `verification_tokens` | NextAuth email verification |
| `clients` | Invoice recipients, scoped to a user |
| `invoices` | Core billing document; all monetary values stored as integer cents |
| `line_items` | Ordered line items per invoice |
| `payments` | Stripe payment records for an invoice |
| `subscriptions` | Stripe subscription records |
| `invoice_activities` | Immutable audit log of invoice lifecycle events |

### Design Decisions

- **Monetary values as cents (integers):** Avoids float rounding errors. All routes accept dollars and convert via `dollarsToCents()` before storing.
- **Cascading deletes:** `Client → Invoice → LineItem`, `User → Client`, `User → Invoice`, `Invoice → InvoiceActivity` all cascade on user deletion.
- **Soft-cancel vs hard-delete:** DRAFT invoices are hard-deleted; non-DRAFT invoices are soft-cancelled (status = CANCELLED).
- **Invoice number generation:** Sequential `INV-XXXX` format scoped per user. Count-based — suitable for MVP concurrency levels.

---

## 2. Data Access Layer (DAL)

**Files:**
- `src/lib/dal/clients.ts` — Client CRUD + ownership-scoped queries
- `src/lib/dal/invoices.ts` — Invoice CRUD, totals calculation, invoice number generation, activity logging
- `src/lib/dal/users.ts` — User profile queries
- `src/lib/dal/index.ts` — Barrel re-export

### Key Functions

```
// clients.ts
getClient(userId, clientId) → Client | null
listClients(userId, options) → ClientPage (paginated)
createClient(userId, input) → Client
updateClient(userId, clientId, input) → Client | null
deleteClient(userId, clientId) → boolean

// invoices.ts
generateInvoiceNumber(userId) → string ("INV-XXXX")
computeTotals(lineItems, taxRate, discountDollars) → InvoiceTotals
getInvoice(userId, invoiceId) → InvoiceWithClient | null
listInvoices(userId, options) → PaginatedInvoices
createInvoice(userId, input) → InvoiceWithClient
updateInvoice(userId, invoiceId, input, current) → InvoiceWithClient
deleteInvoice(userId, invoiceId) → "deleted" | "not_found" | "not_draft"
logActivity(invoiceId, type, metadata?) → void

// users.ts
getUserProfile(userId) → User | null
updateUserProfile(userId, input) → User
```

All DAL functions enforce user-ownership: every query includes `userId` in the WHERE clause.

---

## 3. API Routes

### Clients

| Method | Route | Description |
|---|---|---|
| GET | `/api/clients` | Paginated list with search |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/[id]` | Get single client |
| PATCH | `/api/clients/[id]` | Update client |
| DELETE | `/api/clients/[id]` | Delete client |

**Pagination params:** `page`, `pageSize` (max 100)  
**Search params:** `search` — matches name, email, company (case-insensitive)

### Invoices

| Method | Route | Description |
|---|---|---|
| GET | `/api/invoices` | Paginated list, filter by status/clientId |
| POST | `/api/invoices` | Create DRAFT invoice |
| GET | `/api/invoices/[id]` | Get invoice; auto-transitions SENT→VIEWED |
| PATCH | `/api/invoices/[id]` | Update invoice (blocked if PAID/CANCELLED) |
| DELETE | `/api/invoices/[id]` | Hard-delete DRAFT only |
| PATCH | `/api/invoices/[id]/status` | Manual status transition |
| POST | `/api/invoices/[id]/send` | Mark SENT, create Stripe payment link |
| POST | `/api/invoices/[id]/duplicate` | Clone invoice as new DRAFT |
| POST | `/api/invoices/[id]/reminder` | Log reminder activity |
| GET | `/api/invoices/[id]/pdf` | Stream PDF download |

**Pagination params:** `page`, `limit` (max 100)  
**Filter params:** `status` (InvoiceStatus enum), `clientId`

### User Profile

| Method | Route | Description |
|---|---|---|
| GET | `/api/user/profile` | Get authenticated user's profile |
| PATCH | `/api/user/profile` | Update profile fields |

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create user profile after Supabase auth signup |
| * | `/api/auth/[...nextauth]` | NextAuth handler (Google, GitHub, Credentials) |

---

## 4. Input Validation

All API inputs validated with **Zod** schemas at the route boundary before any DB access.

### Zod Schemas

| Route | Schema |
|---|---|
| POST /api/invoices | `createInvoiceSchema` — clientId (cuid), dueDate (ISO 8601), lineItems (min 1) |
| PATCH /api/invoices/[id] | `updateInvoiceSchema` — all fields optional |
| PATCH /api/invoices/[id]/status | `updateStatusSchema` — z.nativeEnum(InvoiceStatus) |
| POST/PATCH /api/clients | `createClientSchema` / `updateClientSchema` |
| PATCH /api/user/profile | `updateProfileSchema` — logoUrl must be valid URL |
| POST /api/auth/register | `registerSchema` — id must be UUID |

**Validation errors** return `400 Bad Request` with Zod's formatted error message.

---

## 5. Error Handling

**File:** `src/lib/errors.ts`

### Consistent HTTP Status Codes

| Status | Meaning | Helper |
|---|---|---|
| 200 | Success | `ok(data)` |
| 201 | Created | `created(data)` |
| 400 | Validation error | `badRequest(message)` |
| 401 | Not authenticated | `unauthorized()` |
| 403 | Not authorized | `forbidden(message)` |
| 404 | Resource not found | `notFound(resource)` |
| 409 | Business rule conflict | `conflict(message)` |
| 500 | Unexpected server error | `serverError(message)` |

### Conflict (409) Rules

- PATCH invoice: blocked if status is PAID or CANCELLED
- DELETE invoice: blocked if status is not DRAFT
- POST /send: blocked if status is not DRAFT
- POST /reminder: blocked if status is PAID, CANCELLED, or DRAFT
- POST /register: blocked if email already has a profile

### ApiError Class

```typescript
throw new ApiError("Custom message", 409);
```

Route handlers can be wrapped with `withErrorHandler()` to automatically catch and format `ApiError` instances.

---

## 6. Pagination

### Invoice List

- Strategy: **offset pagination**
- Params: `page` (default 1), `limit` (default 20, max 100)
- Response shape: `{ data, total, page, limit }`

### Client List

- Strategy: **offset pagination**
- Params: `page` (default 1), `pageSize` (default 50, max 100)
- Response shape: `{ data, total, page, limit, pageSize, totalPages }`

---

## 7. Integration Tests

**Test framework:** Jest 29 with `jest-environment-node`  
**Test location:** `src/__tests__/api/`

### Test Files

| File | Coverage |
|---|---|
| `clients.test.ts` | 13 test cases across GET list, POST, GET by ID, PATCH, DELETE |
| `invoices.test.ts` | 22 test cases across GET list, POST, GET by ID, PATCH, DELETE, status update, duplicate |
| `profile.test.ts` | 8 test cases across GET and PATCH profile |

**Total: 43 integration tests**

### Mock Strategy

- `@/lib/prisma` — replaced with a typed mock object (`getPrismaMock()`)
- `next-auth` — `getServerSession` mocked per test with `jest.fn()`
- `@/lib/auth` — `authOptions` stubbed to `{}`
- `@/lib/stripe` — Stripe API methods stubbed for send/duplicate tests
- `$transaction` — mock delegates to the same prisma mock (callback form) or `Promise.all` (array form)

All mocks are reset in `beforeEach` via `resetPrismaMock()` to prevent state leakage between tests.

### Test Shared Helpers

**File:** `src/__tests__/helpers/mock-prisma.ts`  
Exports `getPrismaMock()` and `resetPrismaMock()` for use across all test files.

---

## 8. Transactions

Prisma `$transaction` is used in routes where multiple DB writes must be atomic:

| Route | Operations in Transaction |
|---|---|
| GET /invoices/[id] | SENT→VIEWED status update + activity log |
| PATCH /invoices/[id]/status | Status update + activity log |
| POST /invoices/[id]/send | SENT update + Stripe link storage + activity log |

---

## 9. Security

- All routes verify session via `getServerSession(authOptions)` — returns 401 if missing
- All DB queries include `userId` in WHERE clause — prevents cross-user data access
- No raw SQL — all queries use typed Prisma client
- Zod validation prevents malformed inputs from reaching the database
- Stripe webhook secret validated via `stripe.webhooks.constructEvent()` in `/api/webhooks/stripe`

---

## 10. Known Limitations & Future Work

| Item | Notes |
|---|---|
| Credentials auth | `passwordHash` not in schema; placeholder only. Use Supabase Auth or add `passwordHash` field. |
| Invoice number collisions | Count-based generation is not safe under high concurrency; use a DB sequence for production. |
| Email sending | `sendEmail` and `sendReminderEmail` are stubbed with TODO comments; integrate Resend. |
| PDF storage | PDF generation works but `pdfUrl` is not persisted to Supabase Storage after generation. |
| Cursor pagination | Offset pagination used for simplicity; cursor-based is more efficient for large datasets. |
| Rate limiting | No rate limiting on auth or API routes; add middleware for production. |
