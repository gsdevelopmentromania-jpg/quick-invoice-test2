# API Implementation Log — Quick Invoice Test 2
**Phase:** Core MVP Build — Data Model & API  
**Author:** Core (Backend Engineer)  
**Date:** 2026-04-01  
**Status:** Complete

---

## Summary

All primary data model and API endpoints have been implemented and verified. This document records what was built, what was found pre-existing, and what bugs were corrected.

---

## 1. Database Layer

### Migration
- **File:** `prisma/migrations/20260101000000_init/migration.sql`
- **Status:** ✅ Complete
- All tables created: `users`, `clients`, `invoices`, `line_items`, `payments`, `subscriptions`, `invoice_activities`, plus NextAuth adapter tables (`accounts`, `sessions`, `verification_tokens`)
- All enums: `Plan`, `InvoiceStatus`, `PaymentStatus`, `SubscriptionStatus`
- All indexes and foreign key constraints in place
- Monetary values stored as **integers (cents)** to avoid floating-point errors

### Schema
- **File:** `prisma/schema.prisma`
- PostgreSQL with Supabase connection pooling support (`directUrl`)
- `Invoice` ↔ `Client` ↔ `User` cascade ownership hierarchy
- `LineItem` cascades on invoice delete
- Unique constraint on `(userId, invoiceNumber)` prevents number collisions per user

---

## 2. Data Access Layer (DAL)

All DAL modules are in `src/lib/dal/` and exported via barrel at `src/lib/dal/index.ts`.

### `src/lib/dal/clients.ts`
| Function | Description |
|---|---|
| `getClient(userId, clientId)` | Ownership-scoped single-record fetch |
| `listClients(userId, options)` | Paginated list with name/email/company search |
| `createClient(userId, input)` | Creates client record |
| `updateClient(userId, clientId, input)` | Ownership-checked partial update |
| `deleteClient(userId, clientId)` | Ownership-checked delete |

### `src/lib/dal/invoices.ts`
| Function | Description |
|---|---|
| `generateInvoiceNumber(userId)` | Sequential `INV-NNNN` format |
| `computeTotals(lineItems, taxRate, discountDollars)` | Pure function; all outputs in cents |
| `getInvoice(userId, invoiceId)` | Includes client + line items |
| `listInvoices(userId, options)` | Paginated, filterable by status/clientId |
| `createInvoice(userId, input)` | Full transactional create with line items |
| `updateInvoice(userId, invoiceId, input, currentInvoice)` | Recalculates totals; replaces line items |
| `deleteInvoice(userId, invoiceId)` | Only DRAFT invoices; returns typed result |
| `logActivity(invoiceId, type, metadata?)` | Activity log helper |

### `src/lib/dal/users.ts`
| Function | Description |
|---|---|
| `getUserProfile(userId)` | Full user record fetch |
| `updateUserProfile(userId, input)` | Partial profile update |

---

## 3. API Routes

### Clients

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/clients` | ✅ | Paginated list; supports `page`, `pageSize`, `search` |
| `POST` | `/api/clients` | ✅ | Create client; validates name, email, optional currency |
| `GET` | `/api/clients/[id]` | ✅ | Fetch single client (ownership-scoped) |
| `PATCH` | `/api/clients/[id]` | ✅ | Partial update; validates all fields including currency |
| `DELETE` | `/api/clients/[id]` | ✅ | Hard delete |

### Invoices

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/invoices` | ✅ | Paginated list; filters by `status`, `clientId`, `page`, `limit` |
| `POST` | `/api/invoices` | ✅ | Create DRAFT invoice with line items; auto-generates invoice number |
| `GET` | `/api/invoices/[id]` | ✅ | Fetch with client + line items; auto-transitions SENT→VIEWED |
| `PATCH` | `/api/invoices/[id]` | ✅ | Partial update; recalculates totals; blocks PAID/CANCELLED |
| `DELETE` | `/api/invoices/[id]` | ✅ | DRAFT-only hard delete |
| `PATCH` | `/api/invoices/[id]/status` | ✅ | Manual status transition; logs activity; sets `paidAt` on PAID |
| `POST` | `/api/invoices/[id]/send` | ✅ | Marks SENT; creates Stripe payment link; logs activity |
| `POST` | `/api/invoices/[id]/duplicate` | ✅ | Clones invoice as new DRAFT with new invoice number |
| `GET` | `/api/invoices/[id]/pdf` | ✅ | Streams PDF (React-PDF renderer) |
| `POST` | `/api/invoices/[id]/reminder` | ✅ | Logs reminder activity; blocks DRAFT/PAID/CANCELLED |

### User

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/profile` | ✅ | Fetch current user profile |
| `PATCH` | `/api/user/profile` | ✅ | Update profile fields; validates `logoUrl` as URL, `currency` as 3-char |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `*` | `/api/auth/[...nextauth]` | NextAuth handler (JWT, Google, GitHub, Credentials) |
| `POST` | `/api/auth/register` | Email/password registration |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/stripe` | Stripe webhook handler (payment intent succeeded) |

---

## 4. Input Validation

All API routes validate inputs with **Zod** schemas before touching the database.

Key schema decisions:
- `email` → `z.string().email()` (format enforced)
- `currency` → `z.string().length(3)` (ISO 4217 — 3-char codes only)
- `dueDate` → `z.string().datetime()` (ISO 8601 required)
- `lineItems` → `z.array(...).min(1)` (at least one item required on create)
- `taxRate` → `z.number().min(0).max(100)` (percentage)
- `unitPrice` → `z.number().nonnegative()` (dollars; converted to cents server-side)
- `logoUrl` → `z.string().url()` (must be a valid URL)

---

## 5. Error Handling

Consistent error responses via `src/lib/errors.ts`:

```
{ "error": "<message>" }   →  4xx / 5xx
{ "data": <payload> }      →  2xx
```

All routes now wrapped in try/catch blocks returning `500` on unexpected errors.  
`ApiError` class available for service-layer throws (caught at route boundary).

HTTP status code conventions:
- `400` — Zod validation failure or bad input
- `401` — Missing/invalid session
- `403` — Forbidden (wrong owner)
- `404` — Resource not found or not owned by caller
- `409` — State conflict (e.g., editing a PAID invoice)
- `500` — Unexpected server error

---

## 6. Pagination

Both clients and invoices use **offset pagination**:

| Parameter | Default | Max | Endpoint |
|---|---|---|---|
| `page` | 1 | — | Clients, Invoices |
| `pageSize` | 50 | 100 | Clients |
| `limit` | 20 | 100 | Invoices |

Response shape:
```json
{
  "data": {
    "data": [...],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

Cursor-based pagination is not implemented at this stage; offset is sufficient for MVP scale.

---

## 7. Tests

All integration tests live in `src/__tests__/api/`.

| Test File | Coverage |
|---|---|
| `clients.test.ts` | GET list, GET single, POST, PATCH, DELETE — auth, validation, pagination, 404 |
| `invoices.test.ts` | GET list, GET single, POST, PATCH, DELETE, status PATCH, duplicate POST |
| `profile.test.ts` | GET profile, PATCH profile — auth, field validation |

Tests use:
- **Jest** with `jest-environment-node`
- `src/__tests__/helpers/mock-prisma.ts` — shared Prisma mock with `$transaction` support
- `jest.mock("next-auth")` + `jest.mock("@/lib/auth")` for session mocking
- No real DB connection required

Run with: `npm test` or `npm run test:ci`

---

## 8. Bugs Fixed in This Task

### Bug 1 — Missing `currency` field in client Zod schemas
- **File:** `src/app/api/clients/route.ts`, `src/app/api/clients/[id]/route.ts`
- **Problem:** `createClientSchema` and `updateClientSchema` did not include `currency`. The `Client` model has an optional `currency` field, and `CreateClientInput` / `UpdateClientInput` types include it. Sending `currency` in the request body would silently discard it.
- **Fix:** Added `currency: z.string().length(3).optional()` to both schemas.

### Bug 2 — Double-conversion of unit price in invoice PATCH recalculation
- **File:** `src/app/api/invoices/[id]/route.ts`
- **Problem:** When `PATCH /api/invoices/[id]` was called without new `lineItems` (e.g., updating only `notes`), the handler recomputed totals using the existing line items. However, `unitPrice` in the DB is stored in **cents** (e.g., `10000`), and the code passed it directly to `dollarsToCents()`, multiplying by 100 again (result: `1,000,000` instead of `10,000`). This caused inflated totals on any metadata-only patch.
- **Fix:** When falling back to existing line items, divide `unitPrice` by 100 before calling `dollarsToCents()` (i.e., convert cents → dollars → cents correctly). New line items from the request body are still in dollars, so they are unaffected.

---

## 9. Architecture Decisions

- **No DAL abstraction in route handlers** — Routes call Prisma directly for testability with the shared mock. The DAL layer exists for reuse in future background jobs or server actions.
- **All money in cents** — Consistent with Stripe's model; avoids floating-point rounding errors.
- **JWT sessions** — Stateless; compatible with edge deployments.
- **Activity log** — Append-only `invoice_activities` table for audit trail; written in transactions alongside status changes.
