# Project Scaffolding Report
**Project:** Quick Invoice Test 2  
**Phase:** Technical Architecture · Step 2 — Project Scaffolding  
**Author:** Sentinel (Infrastructure Engineer)  
**Date:** 2026-03-31

---

## Overview

Full project scaffold for the Quick Invoice freelancer invoicing SaaS. Built on **Next.js 14 (App Router)**, **TypeScript (strict)**, **PostgreSQL via Prisma**, **NextAuth.js**, **Stripe**, and **@react-pdf/renderer**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.7 (strict mode) |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | NextAuth.js v4 (JWT + Prisma Adapter) |
| Payments | Stripe (Payment Links + Webhooks) |
| PDF | @react-pdf/renderer |
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
| `.prettierrc` | Formatting: 2-space indent, 100-char width, double quotes |
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
npm run db:migrate       # prisma migrate dev
npm run db:migrate:deploy # prisma migrate deploy (CI/prod)
npm run db:seed          # Seed demo data
npm run test:ci          # Jest (CI mode)
```

---

## 2. Database Setup

### Schema (`prisma/schema.prisma`)

**Models:**

| Model | Purpose |
|---|---|
| `User` | Auth + billing (plan, stripeCustomerId, businessName) |
| `Account` | NextAuth OAuth accounts |
| `Session` | NextAuth sessions |
| `VerificationToken` | Email verification |
| `Client` | Freelancer's clients (name, email, company, address) |
| `Invoice` | Core invoice (status, dueDate, currency, taxRate, Stripe links) |
| `LineItem` | Invoice line items (description, qty, unitPrice, amount) |

**Enums:**
- `InvoiceStatus`: `DRAFT` → `SENT` → `VIEWED` → `PAID` / `OVERDUE` / `CANCELLED`
- `Plan`: `FREE` | `PRO` | `TEAM`

### Initial Migration (`prisma/migrations/20260101000000_init/migration.sql`)

Full DDL for all tables, indexes, and foreign keys. Applied via:

```bash
npm run db:migrate:deploy   # Production / CI
npm run db:migrate          # Development (with prompts)
```

### Seed Data (`prisma/seed.ts`)

Creates:
- 1 demo user (`demo@quickinvoice.app` / `password123`)
- 2 demo clients (Acme Corp, StartupCo)
- 3 demo invoices (PAID, SENT, DRAFT states)

```bash
npm run db:seed
```

---

## 3. Authentication

### Files Created

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config: credentials + Google + GitHub OAuth |
| `src/middleware.ts` | Protects `/dashboard/**`, `/invoices/**`, `/clients/**`, `/api/invoices/**`, `/api/clients/**` |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler |
| `src/app/api/auth/register/route.ts` | Email/password registration |
| `src/types/next-auth.d.ts` | Session type augmentation (adds `user.id`) |

### Auth Strategy
- **JWT sessions** (no DB session lookups on every request)
- **Credentials**: bcrypt password hash (12 rounds)
- **OAuth**: Google + GitHub (extensible)
- **Adapter**: PrismaAdapter stores OAuth accounts

---

## 4. API Route Stubs

All routes return `ApiResponse<T>` typed responses and include Zod input validation.

### Invoice Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/invoices` | List invoices (paginated, filterable by status) |
| `POST` | `/api/invoices` | Create invoice (DRAFT) with line items |
| `GET` | `/api/invoices/[id]` | Get single invoice (auto-marks SENT→VIEWED) |
| `PATCH` | `/api/invoices/[id]` | Update invoice (blocked on PAID/CANCELLED) |
| `DELETE` | `/api/invoices/[id]` | Hard-delete DRAFT; soft-cancel others |
| `POST` | `/api/invoices/[id]/send` | Send invoice: creates Stripe Payment Link, marks SENT |
| `GET` | `/api/invoices/[id]/pdf` | Stream PDF for download |

### Client Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/clients` | List clients (paginated, searchable) |
| `POST` | `/api/clients` | Create client |
| `GET` | `/api/clients/[id]` | Get single client |
| `PATCH` | `/api/clients/[id]` | Update client |
| `DELETE` | `/api/clients/[id]` | Delete client |

### Webhook & User Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/webhooks/stripe` | Handle Stripe events (payment completed, subscription changes) |
| `GET` | `/api/user/profile` | Get current user profile |
| `PATCH` | `/api/user/profile` | Update profile (businessName, currency, logoUrl, etc.) |

### Invoice Send Flow

```
POST /api/invoices/[id]/send
  → Validate: status must be DRAFT
  → Calculate subtotal + tax → total
  → Create Stripe Price (unit_amount in cents)
  → Create Stripe PaymentLink (with invoiceId metadata)
  → Update invoice: status=SENT, sentAt, stripePaymentLinkUrl
  → Send email via src/lib/email.ts (sendInvoiceEmail)
```

### Stripe Webhook Flow

```
POST /api/webhooks/stripe
  → Verify signature with STRIPE_WEBHOOK_SECRET
  → checkout.session.completed → mark invoice PAID
  → customer.subscription.deleted → downgrade user to FREE
  → customer.subscription.updated → sync plan
```

---

## 5. Email (`src/lib/email.ts`)

Pluggable email utility using Nodemailer (SMTP):

```typescript
import { sendInvoiceEmail, sendPasswordResetEmail } from "@/lib/email";

// Send invoice to client with optional Stripe payment button
await sendInvoiceEmail({
  invoice,               // InvoiceWithClient (includes lineItems + client)
  paymentUrl,            // Stripe Payment Link URL (optional)
  senderName: "Alex",
  senderEmail: "alex@example.com",
});

// Send password reset link
await sendPasswordResetEmail({ to: "user@example.com", resetUrl });
```

**To swap to Resend:** Replace the `nodemailer.createTransport()` call with `new Resend(process.env.RESEND_API_KEY)` and update `sendMail` → `emails.send`.

Required env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

---

## 6. PDF Generation (`src/lib/pdf/invoice-pdf.tsx`)

React component using `@react-pdf/renderer`:
- Business name/address header
- Bill-to client info + issue/due dates
- Line items table with qty, unit price, amount
- Subtotal, tax, total due
- Optional Stripe payment link embedded
- Exported via `/api/invoices/[id]/pdf` as `application/pdf`

---

## 7. Testing (`jest.config.js`, `jest.setup.js`)

| File | Purpose |
|---|---|
| `jest.config.js` | Jest config using `next/jest` (SWC transform, no ts-jest needed) |
| `jest.setup.js` | Stubs env vars (NEXTAUTH_SECRET, DATABASE_URL, STRIPE_SECRET_KEY) |

```bash
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run test:ci      # CI mode (no watch, fail on missing tests OK)
```

Tests go in `src/**/__tests__/*.test.ts`. Coverage threshold: 50% across all metrics.

---

## 8. Environment Variables (`.env.example`)

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/quick_invoice

# NextAuth
NEXTAUTH_SECRET=         # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...

# Email (Resend or SMTP)
RESEND_API_KEY=re_...
SMTP_HOST=
EMAIL_FROM=noreply@quickinvoice.app

# Storage (logo uploads)
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
```

---

## 9. CI/CD Pipeline

> **Note:** GitHub API restricts writing to `.github/workflows/` on non-default branches. Workflows are stored in `github-workflows/` and must be **moved** to `.github/workflows/` after merging to `main`.
>
> ```bash
> cp -r github-workflows/ .github/workflows/
> ```

### `github-workflows/ci.yml` — Runs on every push/PR

**Jobs:**
1. **lint-and-type-check** — `tsc --noEmit` + ESLint + Prettier check
2. **test** — Spins up PostgreSQL 16 service, runs migrations, runs Jest
3. **build** — `next build` (requires lint to pass)

### `github-workflows/deploy.yml` — Runs on `main` branch push

**Steps:**
1. Install + generate Prisma
2. Run production migrations (`prisma migrate deploy`)
3. Deploy to Vercel via `amondnet/vercel-action`

**Required GitHub Secrets:**
```
DATABASE_URL          Production PostgreSQL URL
VERCEL_TOKEN          Vercel API token
VERCEL_ORG_ID         Vercel org ID
VERCEL_PROJECT_ID     Vercel project ID
```

---

## 10. Docker Setup

### `Dockerfile` — Multi-stage production build

| Stage | Purpose |
|---|---|
| `deps` | Install npm dependencies + generate Prisma |
| `builder` | `next build` with build args for env vars |
| `runner` | Minimal Alpine image; non-root user; standalone output |

### `docker-compose.yml` — Local development

**Services:**
- `postgres` — PostgreSQL 16 on port 5432 with health check
- `app` — Next.js app on port 3000 (depends on postgres)
- `stripe-cli` — Stripe webhook forwarding (opt-in via `--profile stripe`)

```bash
# Start all services
docker-compose up -d

# Start with Stripe webhook forwarding
docker-compose --profile stripe up -d
```

---

## Next Steps

| Priority | Action |
|---|---|
| 🔴 High | Move `github-workflows/` → `.github/workflows/` after merging to main |
| 🔴 High | Add Tailwind CSS config and install `tailwindcss` dependency |
| 🔴 High | Add `output: "standalone"` to `next.config.mjs` for Docker |
| 🟡 Medium | Build dashboard UI (`/dashboard`, `/invoices`, `/clients` pages) |
| 🟡 Medium | Add invoice number auto-increment as a DB sequence |
| 🟡 Medium | Write API integration tests |
| 🟢 Low | Add Sentry error tracking |
| 🟢 Low | Add rate limiting middleware |

---

## Directory Structure

```
quick-invoice/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── jest.config.js                ← NEW: Jest config (next/jest SWC transform)
├── jest.setup.js                 ← NEW: env stubs for tests
├── next.config.mjs
├── package.json
├── tsconfig.json
├── github-workflows/             ← rename to .github/workflows/ post-merge
│   ├── ci.yml
│   └── deploy.yml
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       ├── migration_lock.toml   ← NEW
│       └── 20260101000000_init/
│           └── migration.sql     ← NEW: full DDL for all tables
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
    │       │       └── pdf/route.ts
    │       ├── clients/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── user/
    │       │   └── profile/route.ts
    │       └── webhooks/
    │           └── stripe/route.ts
    ├── lib/
    │   ├── auth.ts
    │   ├── email.ts              ← NEW: Nodemailer/Resend utility
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

*Report generated by Sentinel (Infrastructure Engineer) · 2026-03-31*
