# Technical Architecture — Quick Invoice Test 2
**Phase:** Technical Architecture · Step 1  
**Author:** Apex (Tech Lead)  
**Date:** 2026-03-31  
**Status:** Approved for Implementation

---

## Table of Contents
1. [Stack Decision](#1-stack-decision)
2. [Database Schema](#2-database-schema)
3. [API Design](#3-api-design)
4. [Auth Flow](#4-auth-flow)
5. [File Structure](#5-file-structure)
6. [Infrastructure](#6-infrastructure)
7. [Cost Estimate](#7-cost-estimate)
8. [Security Checklist](#8-security-checklist)
9. [Implementation Tasks](#9-implementation-tasks)

---

## 1. Stack Decision

### Chosen Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Framework** | Next.js (App Router) | 14.x | Full-stack in one repo; SSR for invoice public pages; API routes for backend; best-in-class Vercel deployment; React Server Components reduce client JS bundle |
| **Language** | TypeScript | 5.x (strict) | Type safety across front-end and API; catches schema drift at compile time; non-negotiable for a billing product |
| **Database** | PostgreSQL via Supabase | latest | Relational model fits invoices/line-items perfectly; Supabase provides managed Postgres, Row Level Security (RLS), real-time subscriptions, and a generous free tier |
| **ORM** | Prisma | 5.x | Type-safe queries; migration management; excellent Next.js integration; schema-as-code |
| **Auth** | Supabase Auth | — | Email/password + Google OAuth out-of-the-box; JWT sessions; integrates with Supabase RLS; no extra auth service cost |
| **Payments** | Stripe | latest SDK | Industry standard; Stripe Connect for freelancer payouts; webhooks for payment events; pre-built hosted payment pages reduce PCI scope |
| **PDF Generation** | `@react-pdf/renderer` | 3.x | React-native PDF rendering; runs server-side in Next.js API route; no headless browser dependency (unlike Puppeteer); smaller cold-start |
| **Email** | Resend | latest SDK | Developer-first email API; React Email templates; generous free tier (3,000/mo); better deliverability than raw SMTP |
| **File Storage** | Supabase Storage | — | Already in stack; stores generated PDFs + user logo uploads; CDN-backed; integrated with Supabase auth policies |
| **Hosting** | Vercel | — | Native Next.js host; zero-config CI/CD; Edge Network; preview deployments per PR |
| **CI/CD** | GitHub Actions + Vercel | — | GitHub Actions for lint/test; Vercel handles production deploys on merge to `main` |
| **Styling** | Tailwind CSS | 3.x | Utility-first; fast iteration; consistent design system; pairs well with shadcn/ui |
| **Component Library** | shadcn/ui | latest | Un-opinionated accessible components; copy-paste into codebase; no vendor lock-in |
| **State Management** | Zustand | 4.x | Lightweight; no boilerplate; handles invoice draft state and UI state |
| **Form Validation** | Zod + React Hook Form | — | Schema-first validation; shared Zod schemas between front-end and API for consistency |

### Architecture Pattern
**Modular Monolith** — single Next.js application with clear internal module boundaries (`/invoices`, `/clients`, `/billing`, `/auth`). This is the right choice at MVP scale because:
- Zero operational overhead vs. microservices
- Full-stack type-safety within one TypeScript project
- Can extract services later if needed (Strangler Fig pattern)
- Supabase handles the "infra as a service" concerns

### Trade-offs Acknowledged
- **Supabase vendor lock-in**: Mitigated by using Prisma as the ORM abstraction — switching to raw PostgreSQL on another host is a config change, not a rewrite.
- **`@react-pdf/renderer` vs Puppeteer**: React-PDF is slower for complex layouts but has no Chrome dependency and cold-starts cleanly on Vercel serverless. Acceptable for invoice complexity.
- **Next.js App Router**: Some ecosystem packages still lag on RSC compatibility. Pin versions carefully.

---

## 2. Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Required for Supabase connection pooling
}

// ─── USERS ────────────────────────────────────────────────────────────────────
// Mirrors Supabase auth.users; extended with business profile fields.
// Supabase Auth owns the identity record; this table owns the business profile.

model User {
  id              String    @id @default(uuid()) // matches Supabase auth.users.id
  email           String    @unique
  fullName        String?
  businessName    String?
  businessAddress String?
  businessPhone   String?
  logoUrl         String?
  currency        String    @default("USD")      // ISO 4217
  locale          String    @default("en-US")
  stripeCustomerId String?  @unique
  plan            Plan      @default(FREE)
  planExpiresAt   DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  clients         Client[]
  invoices        Invoice[]
  subscriptions   Subscription[]

  @@map("users")
}

enum Plan {
  FREE
  PRO
  TEAM
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

model Client {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  email       String
  company     String?
  address     String?
  phone       String?
  currency    String?   // override user default
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  invoices    Invoice[]

  @@index([userId])
  @@index([userId, email])
  @@map("clients")
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

model Invoice {
  id               String         @id @default(cuid())
  userId           String
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  clientId         String
  client           Client         @relation(fields: [clientId], references: [id])
  invoiceNumber    String                                     // e.g. "INV-0042"
  status           InvoiceStatus  @default(DRAFT)
  currency         String         @default("USD")
  issueDate        DateTime
  dueDate          DateTime
  notes            String?
  footer           String?
  subtotal         Int            // stored in cents to avoid float errors
  taxRate          Decimal?       @db.Decimal(5, 2)           // e.g. 20.00 = 20%
  taxAmount        Int            @default(0)                 // cents
  discountAmount   Int            @default(0)                 // cents
  total            Int                                        // cents
  pdfUrl           String?                                    // Supabase Storage URL
  stripePaymentLinkId String?
  stripePaymentIntentId String?
  paidAt           DateTime?
  sentAt           DateTime?
  viewedAt         DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  lineItems        LineItem[]
  payments         Payment[]
  activities       InvoiceActivity[]

  @@unique([userId, invoiceNumber])
  @@index([userId])
  @@index([userId, status])
  @@index([clientId])
  @@index([stripePaymentIntentId])
  @@map("invoices")
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  OVERDUE
  CANCELLED
}

// ─── LINE ITEMS ───────────────────────────────────────────────────────────────

model LineItem {
  id          String   @id @default(cuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Int      // cents
  amount      Int      // cents = quantity * unitPrice
  sortOrder   Int      @default(0)

  @@index([invoiceId])
  @@map("line_items")
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

model Payment {
  id                    String        @id @default(cuid())
  invoiceId             String
  invoice               Invoice       @relation(fields: [invoiceId], references: [id])
  stripePaymentIntentId String        @unique
  amount                Int           // cents
  currency              String
  status                PaymentStatus
  paidAt                DateTime?
  createdAt             DateTime      @default(now())

  @@index([invoiceId])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

model Subscription {
  id                   String             @id @default(cuid())
  userId               String
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeSubscriptionId String             @unique
  stripePriceId        String
  plan                 Plan
  status               SubscriptionStatus
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  @@index([userId])
  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  UNPAID
  TRIALING
}

// ─── INVOICE ACTIVITY LOG ─────────────────────────────────────────────────────

model InvoiceActivity {
  id          String   @id @default(cuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  type        String   // e.g. "CREATED", "SENT", "VIEWED", "PAID", "REMINDER_SENT"
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([invoiceId])
  @@map("invoice_activities")
}
```

### Key Schema Decisions
- **Money in cents (integers)**: All monetary values stored as integers in the smallest currency unit. Avoids IEEE 754 floating-point errors in financial calculations.
- **Cascade deletes**: Deleting a user deletes their clients and invoices. Deleting an invoice deletes its line items.
- **Soft status machine**: `InvoiceStatus` enum enforces the invoice lifecycle without a separate state table.
- **Activity log**: Append-only `invoice_activities` table enables audit trail and "invoice viewed" notifications without polluting the main invoice record.

---

## 3. API Design

### Base URL
`/api/v1/`

### Authentication
All protected endpoints require a Supabase JWT in the `Authorization: Bearer <token>` header. Server-side, the JWT is validated via `createServerClient` from `@supabase/ssr`.

---

### 3.1 Auth Endpoints (Supabase Auth — handled natively)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | Public | Create account (email + password) |
| POST | `/api/auth/login` | Public | Email/password login → JWT |
| POST | `/api/auth/logout` | Required | Invalidate session |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Set new password with reset token |
| GET | `/api/auth/callback` | Public | OAuth callback handler (Google) |
| GET | `/api/auth/me` | Required | Return current user profile |

---

### 3.2 User / Profile

| Method | Path | Auth | Description | Response Shape |
|--------|------|------|-------------|----------------|
| GET | `/api/v1/profile` | Required | Get current user profile | `{ id, email, fullName, businessName, businessAddress, businessPhone, logoUrl, currency, locale, plan }` |
| PATCH | `/api/v1/profile` | Required | Update profile fields | `{ user: User }` |
| POST | `/api/v1/profile/logo` | Required | Upload business logo | `{ logoUrl: string }` |
| DELETE | `/api/v1/profile/logo` | Required | Remove business logo | `{ success: true }` |

---

### 3.3 Clients

| Method | Path | Auth | Description | Response Shape |
|--------|------|------|-------------|----------------|
| GET | `/api/v1/clients` | Required | List all clients (paginated) | `{ clients: Client[], total: number, page: number, limit: number }` |
| POST | `/api/v1/clients` | Required | Create a client | `{ client: Client }` |
| GET | `/api/v1/clients/:id` | Required | Get single client + invoice history | `{ client: Client, invoices: Invoice[] }` |
| PATCH | `/api/v1/clients/:id` | Required | Update client | `{ client: Client }` |
| DELETE | `/api/v1/clients/:id` | Required | Delete client (soft-block if active invoices) | `{ success: true }` |

---

### 3.4 Invoices

| Method | Path | Auth | Description | Response Shape |
|--------|------|------|-------------|----------------|
| GET | `/api/v1/invoices` | Required | List invoices; filter by `status`, `clientId`; paginate with `page` + `limit` | `{ invoices: Invoice[], total: number, page: number, limit: number }` |
| POST | `/api/v1/invoices` | Required | Create invoice (status=DRAFT) | `{ invoice: Invoice }` |
| GET | `/api/v1/invoices/:id` | Required | Get invoice with line items + client | `{ invoice: Invoice & { lineItems: LineItem[], client: Client } }` |
| PATCH | `/api/v1/invoices/:id` | Required | Update invoice (only DRAFT status) | `{ invoice: Invoice }` |
| DELETE | `/api/v1/invoices/:id` | Required | Delete invoice (only DRAFT) | `{ success: true }` |
| POST | `/api/v1/invoices/:id/send` | Required | Send invoice by email; creates Stripe payment link; sets status=SENT | `{ invoice: Invoice, paymentUrl: string }` |
| POST | `/api/v1/invoices/:id/pdf` | Required | Generate/regenerate PDF; store in Supabase Storage | `{ pdfUrl: string }` |
| POST | `/api/v1/invoices/:id/duplicate` | Required | Clone invoice as new DRAFT | `{ invoice: Invoice }` |
| PATCH | `/api/v1/invoices/:id/status` | Required | Manually update status (e.g., mark PAID) | `{ invoice: Invoice }` |
| POST | `/api/v1/invoices/:id/reminder` | Required | Send payment reminder email | `{ success: true, sentAt: string }` |

---

### 3.5 Public Invoice View (No Auth)

| Method | Path | Auth | Description | Response Shape |
|--------|------|------|-------------|----------------|
| GET | `/api/v1/public/invoices/:token` | Public | Get invoice data for client-facing view page (records `viewedAt`). Token is a signed short-lived JWT. | `{ invoice: PublicInvoice }` |

**`PublicInvoice`** strips all internal IDs and sensitive user data, returning only: `{ invoiceNumber, issueDate, dueDate, lineItems, subtotal, taxAmount, total, currency, businessName, logoUrl, clientName, notes, paymentUrl, status }`

---

### 3.6 Payments / Billing (Stripe)

| Method | Path | Auth | Description | Response Shape |
|--------|------|------|-------------|----------------|
| POST | `/api/v1/billing/checkout` | Required | Create Stripe Checkout session for subscription upgrade | `{ url: string }` |
| POST | `/api/v1/billing/portal` | Required | Create Stripe Customer Portal session | `{ url: string }` |
| GET | `/api/v1/billing/plans` | Public | List available plans + Stripe price IDs | `{ plans: Plan[] }` |
| POST | `/api/webhooks/stripe` | Public (Stripe-signed) | Handle Stripe webhook events (payment_intent.succeeded, subscription.updated, etc.) | `{ received: true }` |

---

### 3.7 Dashboard / Analytics

| Method | Path | Auth | Description | Response Shape |
|--------|------|------|-------------|----------------|
| GET | `/api/v1/dashboard/summary` | Required | Revenue totals (paid/outstanding/overdue), invoice counts, recent activity | `{ totalPaid, totalOutstanding, totalOverdue, invoicesSent, invoicesPaid, recentInvoices: Invoice[] }` |

---

### Standard Error Response

```json
{
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Invoice with ID clx... does not exist.",
    "status": 404
  }
}
```

All errors return appropriate HTTP status codes (400, 401, 403, 404, 409, 422, 429, 500).

---

## 4. Auth Flow

### 4.1 Sign Up (Email + Password)

```
User fills signup form
  → Client calls POST /api/auth/signup { email, password, fullName }
  → Server calls supabase.auth.signUp() → creates auth.users record
  → Server creates matching row in public.users (Postgres trigger or API)
  → Supabase sends confirmation email (configurable: required or optional)
  → On confirmation, user is redirected to /dashboard
  → Supabase session cookie is set (httpOnly, Secure, SameSite=Lax)
```

### 4.2 Login (Email + Password)

```
User submits login form
  → Client calls supabase.auth.signInWithPassword({ email, password })
  → Supabase validates credentials → returns JWT access token + refresh token
  → @supabase/ssr stores tokens in httpOnly cookies
  → User is redirected to /dashboard
  → Middleware validates session on every protected route request
```

### 4.3 Google OAuth

```
User clicks "Continue with Google"
  → Client calls supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/api/auth/callback' })
  → Redirect to Google consent screen
  → Google redirects to /api/auth/callback?code=...
  → Server calls supabase.auth.exchangeCodeForSession(code)
  → User record upserted in public.users
  → Redirect to /dashboard
```

### 4.4 Password Reset

```
User submits "Forgot Password" form
  → POST /api/auth/forgot-password { email }
  → Server calls supabase.auth.resetPasswordForEmail(email, { redirectTo })
  → Supabase sends reset email with magic link → /auth/reset-password?token=...
  → User sets new password
  → POST /api/auth/reset-password { password }
  → Server calls supabase.auth.updateUser({ password })
  → User is signed in and redirected to /dashboard
```

### 4.5 Session Management

- **Storage**: Sessions stored in httpOnly cookies via `@supabase/ssr` `createServerClient` + middleware
- **Access token TTL**: 1 hour (Supabase default)
- **Refresh token TTL**: 7 days (rolling)
- **Middleware**: `middleware.ts` at root runs on every request matching `/((?!_next|api/webhooks|api/v1/public).*)` — validates session and refreshes token if needed
- **Row Level Security**: Supabase RLS policies enforce `auth.uid() = user_id` on all tables. This is a defense-in-depth layer — even if application-level auth is bypassed, the DB rejects cross-user queries.

### 4.6 RLS Policies (examples)

```sql
-- Users can only read/write their own rows
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid() = id);

-- Users can only access their own invoices  
CREATE POLICY "invoices_own_data" ON invoices
  FOR ALL USING (auth.uid() = user_id);

-- Public invoice view: anyone can read a specific invoice by its public token
-- (Handled at API level, not RLS — public endpoint validates signed token)
```

---

## 5. File Structure

```
quick-invoice/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, typecheck, test on PR
│       └── e2e.yml                   # Playwright tests on main
│
├── prisma/
│   ├── schema.prisma                 # Full schema (see Section 2)
│   ├── seed.ts                       # Dev seed data
│   └── migrations/                   # Auto-generated migration files
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Route group — no layout chrome
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── (dashboard)/              # Route group — with sidebar layout
│   │   │   ├── layout.tsx            # Dashboard shell with sidebar
│   │   │   ├── dashboard/page.tsx    # Revenue summary + recent invoices
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx          # Invoice list
│   │   │   │   ├── new/page.tsx      # Create invoice
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Invoice detail / edit
│   │   │   │       └── preview/page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx          # Profile + branding
│   │   │   │   └── billing/page.tsx  # Subscription management
│   │   │   └── upgrade/page.tsx
│   │   │
│   │   ├── invoice/[token]/          # Public client-facing invoice view
│   │   │   └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── callback/route.ts
│   │   │   │   ├── signup/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── forgot-password/route.ts
│   │   │   │   └── reset-password/route.ts
│   │   │   ├── v1/
│   │   │   │   ├── profile/route.ts
│   │   │   │   ├── profile/logo/route.ts
│   │   │   │   ├── clients/route.ts
│   │   │   │   ├── clients/[id]/route.ts
│   │   │   │   ├── invoices/route.ts
│   │   │   │   ├── invoices/[id]/route.ts
│   │   │   │   ├── invoices/[id]/send/route.ts
│   │   │   │   ├── invoices/[id]/pdf/route.ts
│   │   │   │   ├── invoices/[id]/duplicate/route.ts
│   │   │   │   ├── invoices/[id]/status/route.ts
│   │   │   │   ├── invoices/[id]/reminder/route.ts
│   │   │   │   ├── public/invoices/[token]/route.ts
│   │   │   │   ├── billing/checkout/route.ts
│   │   │   │   ├── billing/portal/route.ts
│   │   │   │   ├── billing/plans/route.ts
│   │   │   │   └── dashboard/summary/route.ts
│   │   │   └── webhooks/
│   │   │       └── stripe/route.ts
│   │   │
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (Button, Input, etc.)
│   │   ├── invoice/
│   │   │   ├── InvoiceForm.tsx       # Create/edit invoice form
│   │   │   ├── InvoicePreview.tsx    # Live PDF preview
│   │   │   ├── InvoiceTable.tsx      # List view with filters
│   │   │   ├── InvoiceStatusBadge.tsx
│   │   │   ├── LineItemsEditor.tsx   # Dynamic line items with subtotal calc
│   │   │   └── PublicInvoiceView.tsx # Client-facing read-only view
│   │   ├── client/
│   │   │   ├── ClientForm.tsx
│   │   │   └── ClientSelect.tsx      # Searchable dropdown for invoice form
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   └── RevenueChart.tsx
│   │   ├── billing/
│   │   │   └── PlanCard.tsx
│   │   └── shared/
│   │       ├── Logo.tsx
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   ├── server.ts             # Server Supabase client (SSR)
│   │   │   └── middleware.ts         # Session refresh helper
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   ├── stripe.ts                 # Stripe client + helpers
│   │   ├── resend.ts                 # Resend client + email helpers
│   │   ├── pdf/
│   │   │   └── generateInvoicePdf.ts # @react-pdf/renderer PDF generation
│   │   ├── invoice/
│   │   │   ├── numberGenerator.ts    # Invoice number sequencing
│   │   │   ├── publicToken.ts        # Signed public invoice JWT
│   │   │   └── statusMachine.ts     # Valid status transitions
│   │   └── utils.ts                  # formatCurrency, formatDate, cn()
│   │
│   ├── hooks/
│   │   ├── useInvoices.ts
│   │   ├── useClients.ts
│   │   └── useUser.ts
│   │
│   ├── types/
│   │   ├── invoice.ts                # Exported TS types matching Prisma models
│   │   ├── client.ts
│   │   └── api.ts                    # API request/response shapes
│   │
│   └── emails/                       # React Email templates
│       ├── InvoiceEmail.tsx
│       ├── PaymentReminderEmail.tsx
│       ├── PaymentConfirmationEmail.tsx
│       └── WelcomeEmail.tsx
│
├── middleware.ts                      # Next.js middleware (auth guard)
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json                      # strict: true, target: ES2022
├── .env.local                         # Local dev secrets (gitignored)
├── .env.example                       # Template for env vars
└── package.json
```

---

## 6. Infrastructure

### Services Map

| Concern | Service | Tier (MVP) | Notes |
|---------|---------|-----------|-------|
| **App Hosting** | Vercel | Hobby (free) / Pro ($20/mo) | Zero-config Next.js; preview deployments; Edge Network CDN |
| **Database** | Supabase (PostgreSQL) | Free / Pro ($25/mo) | 500 MB free; 8 GB Pro; connection pooling via PgBouncer |
| **Auth** | Supabase Auth | Included in Supabase | 50,000 MAU free; email OTP; Google OAuth |
| **File Storage** | Supabase Storage | Included (1 GB free / 100 GB Pro) | Stores invoice PDFs + user logos |
| **Email** | Resend | Free (3,000 emails/mo) / Pro ($20/mo) | Transactional email; React Email templates |
| **Payments** | Stripe | Pay-as-you-go (2.9% + 30¢ per card txn) | Payment Links for invoices; Billing for subscriptions |
| **CI/CD** | GitHub Actions | Free (2,000 min/mo) | Lint + type-check + unit tests on every PR |
| **Monitoring** | Vercel Analytics + Sentry (free) | Free tiers | Real User Monitoring; error tracking |

### Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-only — never expose to client

# Database (Supabase connection strings)
DATABASE_URL=                      # Pooled (PgBouncer) — for Prisma queries
DIRECT_URL=                        # Direct — for Prisma migrations

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_TEAM_PRICE_ID=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=invoices@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://quickinvoice.app
INVOICE_TOKEN_SECRET=              # 32-byte random secret for signing public invoice tokens

# Optional: Sentry
SENTRY_DSN=
```

### Deployment Topology

```
                ┌─────────────────────────────────┐
                │          GitHub Repo              │
                │  push → GitHub Actions (CI)       │
                │  merge main → Vercel Deploy        │
                └─────────────┬───────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Vercel Edge CDN   │
                    │  (static assets,    │
                    │   ISR, public pages)│
                    └─────────┬──────────┘
                              │ API requests
                    ┌─────────▼──────────┐
                    │ Vercel Serverless   │
                    │ Functions (API      │
                    │ routes / RSC)       │
                    └──┬──────┬──────────┘
                       │      │
          ┌────────────▼┐   ┌─▼────────────┐
          │  Supabase   │   │   Stripe API   │
          │ (Postgres + │   │  (Payments +   │
          │  Auth +     │   │  Webhooks)     │
          │  Storage)   │   └────────────────┘
          └─────────────┘
                │
          ┌─────▼────────┐
          │   Resend      │
          │ (Email sends) │
          └──────────────┘
```

---

## 7. Cost Estimate

All prices in USD/month. Based on published 2026 pricing.

### 0 Users (Development / Pre-launch)

| Service | Cost |
|---------|------|
| Vercel (Hobby) | $0 |
| Supabase (Free) | $0 |
| Resend (Free) | $0 |
| Stripe (no revenue) | $0 |
| GitHub (free for public/private) | $0 |
| **Total** | **$0/mo** |

### 100 Users (~15 paying @ $12/mo = $180 MRR)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel (Hobby) | $0 | Under free limits |
| Supabase (Free) | $0 | Well under 500 MB / 50K MAU |
| Resend (Free) | $0 | ~500 emails/mo; under 3K limit |
| Stripe (processing fees) | ~$8 | 2.9% + 30¢ on ~$180 in transactions |
| Domain / DNS | ~$2 | Amortized |
| **Total** | **~$10/mo** |

**Net margin at 100 users: ~$170/mo (94%)**

### 1,000 Users (~200 paying @ $12/mo = $2,400 MRR)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel (Pro) | $20 | Needed for team features, more bandwidth |
| Supabase (Pro) | $25 | More storage, backups, no pausing |
| Resend (Pro) | $20 | ~5,000 emails/mo |
| Stripe (processing fees) | ~$80 | 2.9% + 30¢ on ~$2,400 |
| Sentry (Team) | $26 | Error monitoring at scale |
| Domain / misc | $5 |  |
| **Total** | **~$176/mo** |

**Net margin at 1K users: ~$2,224/mo (93%)**

### 10,000 Users (~2,000 paying @ $12/mo = $24,000 MRR)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel (Pro) | $20 | Plus bandwidth overages ~$30 |
| Supabase (Pro) | $25 + compute add-ons ~$50 | Larger DB + read replicas |
| Resend (Pro) | $90 | ~50,000+ emails/mo |
| Stripe (processing) | ~$800 | 2.9% + 30¢ on ~$24K |
| Sentry (Business) | $80 |  |
| Customer support tool (e.g., Crisp) | $25 |  |
| Domain / misc | $10 |  |
| **Total** | **~$1,110/mo** |

**Net margin at 10K users: ~$22,890/mo (95%)**

> **Key insight:** SaaS margin improves with scale because infrastructure costs grow sub-linearly. The dominant variable cost is Stripe's transaction fee, which is directly tied to revenue — an acceptable trade-off.

---

## 8. Security Checklist

### OWASP Top 10 Mitigations

| # | OWASP Risk | Mitigation |
|---|-----------|-----------|
| A01 | Broken Access Control | Supabase RLS policies enforce row-level ownership. Every API route validates `auth.uid()` matches resource owner. Never expose internal IDs in public URLs — use CUID2 which is non-sequential. |
| A02 | Cryptographic Failures | HTTPS enforced (Vercel). Passwords managed by Supabase Auth (bcrypt). Invoice public tokens signed with HS256 JWT (short TTL: 30 days). Env vars never committed to git. |
| A03 | Injection | Prisma ORM uses parameterized queries — no raw SQL string interpolation. All user inputs validated with Zod schemas before reaching the database layer. |
| A04 | Insecure Design | Public invoice view is read-only and returns a filtered `PublicInvoice` DTO. Stripe webhooks verified via `stripe.webhooks.constructEvent()` signature check before processing. |
| A05 | Security Misconfiguration | `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only — never prefixed with `NEXT_PUBLIC_`. Vercel environment variable scoping separates production/preview/development. |
| A06 | Vulnerable Components | Dependabot enabled on GitHub repo. Lock file committed. Pin major versions and review changelogs on upgrades. |
| A07 | Auth Failures | Supabase Auth handles brute-force protection (rate limiting on login). Sessions use httpOnly cookies — XSS cannot steal tokens. Refresh token rotation on every use. |
| A08 | Software & Data Integrity | Stripe webhook signature verification prevents replay attacks. Prisma migrations are version-controlled and reviewed before production apply. |
| A09 | Logging & Monitoring | Sentry captures unhandled errors with stack traces. Vercel function logs retained. `invoice_activities` table provides business-level audit trail. |
| A10 | SSRF | No user-supplied URLs are fetched server-side. Logo uploads go directly to Supabase Storage via pre-signed URLs — server never proxies image content. |

### Rate Limiting

| Endpoint | Limit | Implementation |
|----------|-------|----------------|
| POST `/api/auth/signup` | 5 req/min per IP | Upstash Redis + `@upstash/ratelimit` middleware |
| POST `/api/auth/login` | 10 req/min per IP | Same |
| POST `/api/auth/forgot-password` | 3 req/15min per email | Same |
| POST `/api/v1/invoices/:id/send` | 10 req/hour per user | Prevents spam invoice sending |
| GET `/api/v1/public/invoices/:token` | 60 req/min per IP | Prevents scraping |
| All other API routes | 100 req/min per user | General abuse prevention |

> **Implementation**: Use Upstash Redis (free tier: 10K req/day) with `@upstash/ratelimit`. Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) returned on all limited routes.

### Input Validation

- All API request bodies validated with **Zod schemas** in API route handlers — malformed input returns `422 Unprocessable Entity` before any DB operation.
- File uploads (logo): type validation (JPEG/PNG/WebP only), max size 2 MB enforced server-side.
- Invoice totals **recalculated server-side** — never trust client-sent `total`/`subtotal` values.
- All user-generated strings sanitized before inclusion in PDF or email output.

### Additional Security Measures

- **CSP Headers**: `Content-Security-Policy` header configured in `next.config.mjs` to prevent XSS.
- **CORS**: API routes restrict `Access-Control-Allow-Origin` to app domain only.
- **Invoice PDF URLs**: Supabase Storage objects served via signed URLs with 1-hour expiry — not publicly accessible by default.
- **PCI Compliance**: Cardholder data never touches our servers. Stripe Checkout / Payment Links handle card collection. Stripe is PCI DSS Level 1 certified.
- **Data deletion**: When a user deletes their account, cascade deletes remove all associated data (Postgres foreign key cascades + Supabase Auth user deletion).

---

## 9. Implementation Tasks

| Priority | Task | Component | Est. Complexity |
|----------|------|-----------|----------------|
| 🔴 P0 | Project scaffolding: Next.js 14, TypeScript strict, Tailwind, shadcn/ui | Infra | Low |
| 🔴 P0 | Supabase project setup: DB, Auth, Storage buckets, RLS policies | Infra | Medium |
| 🔴 P0 | Prisma schema + initial migration | Database | Low |
| 🔴 P0 | Auth flows: signup, login, logout, Google OAuth, password reset | Auth | Medium |
| 🔴 P0 | Next.js middleware: session guard + route protection | Auth | Low |
| 🔴 P0 | Invoice CRUD API (create, read, update, delete) | API | Medium |
| 🔴 P0 | Invoice creation UI: form + line items editor + live total calc | UI | High |
| 🔴 P0 | PDF generation: `@react-pdf/renderer` server-side + Supabase Storage upload | Feature | High |
| 🔴 P0 | Email delivery: Resend + invoice email template | Feature | Medium |
| 🔴 P0 | Stripe Payment Links: create on send, attach to invoice | Payments | Medium |
| 🔴 P0 | Stripe webhook handler: mark invoice PAID on `payment_intent.succeeded` | Payments | Medium |
| 🟡 P1 | Client address book: CRUD + autocomplete in invoice form | Feature | Medium |
| 🟡 P1 | Public invoice view page: `/invoice/[token]` | Feature | Low |
| 🟡 P1 | Dashboard: revenue stats + recent invoices list | UI | Medium |
| 🟡 P1 | Stripe Billing: subscription checkout + customer portal | Payments | Medium |
| 🟡 P1 | Plan enforcement: free tier limits (3 invoices/mo) | Feature | Low |
| 🟡 P1 | Profile + branding settings: logo upload, business details | UI | Low |
| 🟡 P1 | Rate limiting: Upstash Redis integration | Security | Low |
| 🟢 P2 | Payment reminders: scheduled email on due date | Feature | Medium |
| 🟢 P2 | Invoice duplicate / clone | Feature | Low |
| 🟢 P2 | Multi-currency support (currency selector per invoice) | Feature | Low |
| 🟢 P2 | Invoice activity log UI | UI | Low |
| 🟢 P2 | E2E tests: Playwright for critical paths | Testing | High |

---

## Appendix: Tech Debt Watch List

| Item | Risk | When to Address |
|------|------|----------------|
| Vercel serverless cold starts for PDF generation | PDF generation may timeout on large invoices | At 500+ users; evaluate Vercel Background Functions or dedicated PDF microservice |
| Prisma + PgBouncer connection pooling | Pool exhaustion under high concurrency | At 1K+ concurrent users; tune `connection_limit` in `DATABASE_URL` |
| Invoice number sequencing | Current approach uses DB MAX()+1 which has a race condition under high concurrency | Use Postgres sequence (`SERIAL` or `nextval`) for `invoice_number` counter per user |
| No background job queue | Reminders and async email sends block request lifecycle | At v1.1, add Inngest or Trigger.dev for durable background jobs |

---

*Architecture authored by: Apex (Tech Lead) · 2026-03-31*  
*Review with engineering team before starting scaffold implementation.*  
*Next step: Project Scaffolding (Phase 2, Step 1)*
