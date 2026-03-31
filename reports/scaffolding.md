# Project Scaffolding Report
**Project:** Quick Invoice Test 2  
**Phase:** Technical Architecture · Step 2 — Project Scaffolding  
**Author:** Sentinel (Infrastructure Engineer)  
**Date:** 2026-03-31

---

## Overview

Full project scaffold for the Quick Invoice freelancer invoicing SaaS. Built on **Next.js 14 (App Router)**, **TypeScript (strict)**, **PostgreSQL via Prisma ORM**, **NextAuth.js v4**, **Stripe**, and **@react-pdf/renderer**. Architecture follows the spec in `reports/architecture.md`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.7 (strict mode) |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | NextAuth.js v4 (JWT + PrismaAdapter) |
| Payments | Stripe (Payment Links + Webhooks) |
| PDF | @react-pdf/renderer v3 |
| Email | Nodemailer / Resend (pluggable) |
| Styling | Tailwind CSS |
| Validation | Zod |
| CI/CD | GitHub Actions |
| Containerization | Docker + docker-compose |

---

## 1. Project Initialization

### Files Created

| File | Purpose |
|---|---|
| `package.json` | All dependencies; npm scripts for dev, build, lint, db, test |
| `tsconfig.json` | Strict TypeScript; target ES2017; path alias `@/*` → `src/*` |
| `.eslintrc.json` | next/core-web-vitals + @typescript-eslint/recommended + prettier |
| `.prettierrc` | 2-space indent, 100-char width, double quotes |
| `next.config.mjs` | Next.js 14 config (mjs extension required) |
| `.gitignore` | Excludes node_modules, .next, .env*, coverage |

### Key npm Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run type-check       # tsc --noEmit
npm run lint             # ESLint
npm run format           # Prettier write
npm run db:generate      # prisma generate
npm run db:migrate       # prisma migrate dev (local)
npm run db:migrate:deploy # prisma migrate deploy (CI/prod)
npm run db:seed          # Seed demo data
npm run test:ci          # Jest (CI mode)
```

---

## 2. Database Setup

### Schema (`prisma/schema.prisma`)

**Design principles from architecture spec:**
- ✅ All monetary values stored as **integers in cents** (avoids IEEE 754 float errors)
- ✅ `@@map` directives for snake_case table names
- ✅ `DIRECT_URL` for Supabase connection pooling (pgBouncer bypass for migrations)
- ✅ Cascade deletes: user → clients → invoices → line_items

**Models:**

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Business profile, plan, Stripe customer ID |
| `Account` | `accounts` | NextAuth OAuth accounts |
| `Session` | `sessions` | NextAuth sessions |
| `VerificationToken` | `verification_tokens` | Email verification |
| `Client` | `clients` | Freelancer's billable clients |
| `Invoice` | `invoices` | Core invoice (cents-based amounts) |
| `LineItem` | `line_items` | Invoice line items (qty as Decimal, prices in cents) |
| `Payment` | `payments` | Stripe payment records |
| `Subscription` | `subscriptions` | Stripe subscription tracking |
| `InvoiceActivity` | `invoice_activities` | Append-only audit log |

**Enums:**
- `InvoiceStatus`: `DRAFT` → `SENT` → `VIEWED` → `PAID` / `OVERDUE` / `CANCELLED`
- `Plan`: `FREE` | `PRO` | `TEAM`
- `PaymentStatus`: `PENDING` | `SUCCEEDED` | `FAILED` | `REFUNDED`
- `SubscriptionStatus`: `ACTIVE` | `PAST_DUE` | `CANCELLED` | `UNPAID` | `TRIALING`

### Migration

```
prisma/migrations/20260101000000_init/migration.sql
```

Full DDL for all tables, indexes, and foreign keys. Run via:

```bash
npm run db:migrate         # dev (creates migration)
npm run db:migrate:deploy  # prod/CI (applies existing migrations)
```

### Seed Data (`prisma/seed.ts`)

Creates:
- 1 demo user (`demo@quickinvoice.app`)
- 2 demo clients (Acme Corp, StartupCo)
- 3 demo invoices (PAID $2,500 | SENT $1,650 with 10% tax | DRAFT $3,000)
- All monetary values stored correctly as cents

```bash
npm run db:seed
```

---

## 3. Authentication

### Files Created

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config: Google + GitHub OAuth + credentials stub |
| `src/middleware.ts` | Protects dashboard, invoice, client, API routes |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler |
| `src/app/api/auth/register/route.ts` | Creates User profile after Supabase Auth signup |
| `src/types/next-auth.d.ts` | Session type augmentation (adds `user.id`) |

### Auth Strategy
- **JWT sessions** (no DB session lookups on every request)
- **OAuth**: Google + GitHub via PrismaAdapter
- **Credentials**: Placeholder (Supabase Auth recommended per architecture spec)

---

## 4. API Route Stubs

All routes return `ApiResponse<T>` typed responses with Zod input validation.
Monetary inputs accepted as **dollars** (floats); converted to **cents** on server.

### Invoice Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/invoices` | List invoices (paginated, filterable by `status` + `clientId`) |
| `POST` | `/api/invoices` | Create invoice (DRAFT) — computes subtotal/tax/total in cents |
| `GET` | `/api/invoices/[id]` | Get invoice (auto-marks SENT→VIEWED + logs activity) |
| `PATCH` | `/api/invoices/[id]` | Update invoice (recalculates totals) |
| `DELETE` | `/api/invoices/[id]` | Hard-delete DRAFT only |
| `POST` | `/api/invoices/[id]/send` | Send: creates Stripe Payment Link, marks SENT, logs activity |
| `GET` | `/api/invoices/[id]/pdf` | Stream PDF download |
| `POST` | `/api/invoices/[id]/duplicate` | Clone invoice as new DRAFT |
| `PATCH` | `/api/invoices/[id]/status` | Manual status update (e.g., mark PAID) |
| `POST` | `/api/invoices/[id]/reminder` | Send payment reminder email |

### Client Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/clients` | List clients (paginated, searchable) |
| `POST` | `/api/clients` | Create client |
| `GET` | `/api/clients/[id]` | Get client |
| `PATCH` | `/api/clients/[id]` | Update client |
| `DELETE` | `/api/clients/[id]` | Delete client |

### Other Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/webhooks/stripe` | Stripe webhook handler (payment, subscription events) |
| `GET` | `/api/user/profile` | Get current user profile |
| `PATCH` | `/api/user/profile` | Update profile |

---

## 5. PDF Generation (`src/lib/pdf/invoice-pdf.tsx`)

React component using `@react-pdf/renderer`:
- Business header (businessName, businessAddress)
- Bill-to client info + issue/due dates
- Line items table (quantity as Decimal, prices from cents)
- Subtotal, discount, tax, total (all from cents)
- Stripe payment link embedded if available

---

## 6. Email (`src/lib/email.ts`)

Nodemailer-based with pluggable transport:
- `sendInvoiceEmail()` — HTML invoice email with payment link
- `sendPasswordResetEmail()` — Password reset link
- Swap for Resend SDK by replacing `nodemailer.sendMail()` calls

---

## 7. Environment Variables (`.env.example`)

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Supabase)
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@pooler.supabase.com:5432/postgres

# NextAuth
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@quickinvoice.app

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 8. CI/CD Pipeline (`github-workflows/`)

> **⚠️ Note:** Saved to `github-workflows/` — rename to `.github/workflows/` when configuring the repository (GitHub API restriction on this branch).

### `ci.yml` — Runs on every push/PR

**Jobs:**
1. **lint-and-type-check** — `tsc --noEmit` + ESLint + Prettier check
2. **test** — Spins up PostgreSQL 16 service, runs migrations, runs Jest
3. **build** — `next build` (requires lint to pass)

### `deploy.yml` — Runs on `main` push

1. Run production migrations
2. Deploy to Vercel via `amondnet/vercel-action`

**Required Secrets:** `DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## 9. Docker Setup

### `Dockerfile` — Multi-stage production build

| Stage | Purpose |
|---|---|
| `deps` | Install npm deps + generate Prisma |
| `builder` | `next build` with build args |
| `runner` | Alpine, non-root user, standalone output |

### `docker-compose.yml` — Local development

```bash
docker-compose up -d                          # DB + app
docker-compose --profile stripe up -d        # + Stripe webhook forwarding
```

---

## Complete File Structure

```
quick-invoice/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── jest.setup.js
├── next.config.mjs
├── package.json
├── tsconfig.json
├── github-workflows/       ← rename to .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260101000000_init/migration.sql
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   └── api/
    │       ├── auth/
    │       │   ├── [...nextauth]/route.ts
    │       │   └── register/route.ts
    │       ├── invoices/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── route.ts
    │       │       ├── send/route.ts
    │       │       ├── pdf/route.ts
    │       │       ├── duplicate/route.ts
    │       │       ├── status/route.ts
    │       │       └── reminder/route.ts
    │       ├── clients/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── user/
    │       │   └── profile/route.ts
    │       └── webhooks/
    │           └── stripe/route.ts
    ├── lib/
    │   ├── auth.ts
    │   ├── email.ts
    │   ├── prisma.ts
    │   ├── stripe.ts
    │   └── pdf/
    │       └── invoice-pdf.tsx
    ├── middleware.ts
    └── types/
        ├── index.ts
        └── next-auth.d.ts
```

---

## Next Steps

| Priority | Action |
|---|---|
| 🔴 High | Add `output: "standalone"` to `next.config.mjs` for Docker builds |
| 🔴 High | Add `tailwindcss` + `postcss` config + `shadcn/ui` setup |
| 🔴 High | Build dashboard UI pages (`/dashboard`, `/invoices`, `/clients`) |
| 🟡 Medium | Integrate Resend SDK for email (replace Nodemailer) |
| 🟡 Medium | Add invoice number auto-increment as a DB sequence |
| 🟡 Medium | Write API integration tests |
| 🟢 Low | Add Sentry error tracking |
| 🟢 Low | Add rate limiting middleware (e.g., Upstash Ratelimit) |

---

*Report generated by Sentinel (Infrastructure Engineer) · 2026-03-31*
