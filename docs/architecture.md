# Architecture

## Overview

Quick Invoice is a **Next.js 14 App Router** application that combines a server-rendered frontend and a REST API backend in a single Node.js process. It uses Prisma as the ORM, PostgreSQL (hosted on Supabase) as the database, Stripe for billing, and Resend for email delivery.

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router: pages + API routes
│   ├── (auth)/             # Unauthenticated pages (login, register, etc.)
│   ├── (dashboard)/        # Authenticated application pages
│   ├── api/                # REST API route handlers
│   ├── blog/               # MDX blog
│   ├── invoice/[id]/       # Public invoice view (clients, no auth)
│   ├── pricing/            # Public pricing page
│   └── layout.tsx          # Root layout (providers, analytics)
├── components/
│   ├── landing/            # Marketing / landing page sections
│   ├── layout/             # Dashboard shell, sidebar, header
│   └── ui/                 # Shared UI primitives (button, input, card, etc.)
├── hooks/                  # Custom React hooks
├── lib/
│   ├── auth.ts             # NextAuth.js configuration
│   ├── billing.ts          # Plan feature gates (canCreateInvoice, etc.)
│   ├── dal/                # Data Access Layer — raw Prisma queries
│   │   ├── billing.ts
│   │   ├── clients.ts
│   │   ├── invoices.ts
│   │   └── users.ts
│   ├── email.ts            # Resend email helpers
│   ├── errors.ts           # Typed error response helpers
│   ├── health.ts           # Health check logic
│   ├── logger.ts           # Structured logger
│   ├── monitoring.ts       # Performance monitoring helpers
│   ├── pdf/invoice-pdf.tsx # React-PDF invoice template
│   ├── plans.ts            # Static plan config (limits, pricing)
│   ├── prisma.ts           # Prisma client singleton
│   ├── rate-limit.ts       # In-memory rate limiting
│   ├── seo.ts              # SEO helpers (metadata, JSON-LD)
│   └── stripe.ts           # Stripe client
├── types/
│   ├── index.ts            # Shared types, API shapes, money helpers
│   ├── blog.ts             # MDX blog types
│   └── next-auth.d.ts      # NextAuth session type augmentation
└── middleware.ts            # Route protection via NextAuth withAuth
```

---

## Request Lifecycle

```
Browser / Client
      │
      ▼
Next.js Middleware (src/middleware.ts)
  • next-auth/middleware withAuth
  • Protects /dashboard/**, /invoices/**, /clients/**, /settings/**,
    /api/invoices/**, /api/clients/**, /api/user/**
  • Redirects authenticated users away from auth pages
      │
      ▼
Next.js App Router
  ┌─────────────────────────────────────────────┐
  │  Page (Server Component or Client Component)│
  │    └─ fetches data from API routes           │
  └─────────────────────────────────────────────┘
      │
      ▼
API Route Handler (src/app/api/**/)
  1. getServerSession(authOptions)   → authenticate request
  2. Zod schema.safeParse(body)       → validate input
  3. canCreate*/plan-gate check       → enforce billing limits
  4. DAL / prisma query               → read or write database
  5. NextResponse.json({ data })      → return result
```

---

## Authentication

Authentication is handled by **NextAuth.js v4** (`src/lib/auth.ts`) with the `@auth/prisma-adapter`.

Supported providers:
- **Credentials** — email + bcrypt password hash
- **Google OAuth**
- **GitHub OAuth**

Sessions are stored as JWTs (cookies). The session token is extended with `user.id` and `user.plan` via the `jwt` / `session` callbacks.

Password reset and email verification flows use short-lived tokens stored in the `password_reset_tokens` and `verification_tokens` Prisma models.

---

## Data Model

Core entities (see `prisma/schema.prisma` for full schema):

```
User
 ├─ Account[]          (OAuth provider links)
 ├─ Session[]          (NextAuth sessions)
 ├─ Client[]
 ├─ Invoice[]
 ├─ Subscription[]
 └─ PasswordResetToken[]

Invoice
 ├─ LineItem[]
 ├─ Payment[]
 └─ InvoiceActivity[]  (audit log)

Subscription
 └─ linked to Stripe subscription
```

**Money convention:** all monetary values are stored as **integer cents** in the database to avoid floating-point rounding errors. The helpers `dollarsToCents` and `centsToDollars` in `src/types/index.ts` convert at the API boundary.

---

## Data Access Layer

Business logic that needs database access goes through the **DAL** (`src/lib/dal/`). API routes call DAL functions rather than writing raw Prisma queries inline. This keeps API route handlers thin and makes the data layer testable in isolation.

```
API Route → DAL function → Prisma → PostgreSQL
```

---

## Billing & Plan Enforcement

Plan configuration lives in `src/lib/plans.ts` as a static constant (`PLAN_CONFIGS`). It is safe to import in both server and client components because it has no server-side dependencies.

Runtime enforcement is in `src/lib/billing.ts`:

- `canCreateInvoice(userId, plan)` — checks the monthly invoice count against the plan limit.
- `canCreateClient(userId, plan)` — checks the total client count against the plan limit.
- `getUserUsage(userId)` — returns current usage counters for the billing subscription endpoint.

Stripe events are received at `/api/webhooks/stripe` and update the `subscriptions` table and the `user.plan` field.

---

## PDF Generation

Invoice PDFs are generated server-side using `@react-pdf/renderer`. The template lives at `src/lib/pdf/invoice-pdf.tsx`. The route `GET /api/invoices/[id]/pdf` renders the template to a binary stream and returns it as `application/pdf`.

PDF downloads are gated behind the **Pro** plan.

---

## Email

Transactional emails are sent via **Resend** (`src/lib/email.ts`). Email types include:

- Email verification on registration
- Password reset links
- Invoice delivery to clients
- Payment reminder emails

---

## Monitoring & Observability

- **Sentry** — error tracking via `@sentry/nextjs`. Configured in `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`.
- **Structured logging** — `src/lib/logger.ts` wraps `console` with log levels controlled by the `LOG_LEVEL` environment variable.
- **Performance monitoring** — `src/lib/monitoring.ts` logs slow API calls. Thresholds are configured via `SLOW_REQUEST_THRESHOLD_MS` and `ALERT_THRESHOLD_MS`.
- **Health endpoint** — `GET /api/health` returns service status and is suitable for use with uptime monitoring tools (BetterUptime, UptimeRobot, etc.).

---

## Frontend Architecture

- **Server Components** are used for data-fetching pages within the App Router.
- **Client Components** (marked with `"use client"`) are used for interactive UI that needs browser hooks.
- **Tailwind CSS** for styling; `tailwind.config.ts` extends the default theme.
- **`next-themes`** provides light/dark mode support.
- **`react-hook-form`** handles form state and validation in client components.
- **`zustand`** is available for client-side global state where needed.

---

## Environment & Deployment

| Environment | Database | Notes |
|---|---|---|
| Local dev | Local PostgreSQL (Docker) or Supabase | `npm run dev` |
| Docker Compose | PostgreSQL container | `docker compose up` |
| Production | Supabase PostgreSQL | Deploy via CI/CD to any Node.js host |

CI/CD pipelines are defined in `github-workflows/ci.yml` (lint, type-check, tests) and `github-workflows/deploy.yml`.

Required environment variables for production: see [`README.md`](../README.md#environment-variables).
