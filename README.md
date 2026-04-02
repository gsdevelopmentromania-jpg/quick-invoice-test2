# Quick Invoice

A SaaS application for freelancers to create, send, and track invoices. Built with Next.js 14, Prisma, PostgreSQL (Supabase), Stripe, and NextAuth.

## Features

- **Authentication** — Email/password, Google OAuth, GitHub OAuth via NextAuth.js
- **Invoice Management** — Create, edit, send, duplicate, and track invoices; auto-generated invoice numbers (INV-0001…)
- **Client Management** — Maintain a client directory with contact and billing details
- **PDF Export** — Generate PDF invoices using `@react-pdf/renderer` (Pro plan)
- **Stripe Billing** — Checkout, subscription management, and webhook handling
- **Payment Reminders** — Send automated email reminders for overdue invoices (Pro plan)
- **Plan Limits** — FREE (3 invoices/month, 5 clients), PRO ($12/mo, unlimited), TEAM/Enterprise ($29/mo, unlimited + team)
- **Email** — Transactional emails via [Resend](https://resend.com)
- **Monitoring** — Sentry error tracking, structured logging, `/api/health` endpoint
- **SEO** — Sitemap, robots.txt, JSON-LD structured data, blog with MDX

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Auth | NextAuth.js v4 + `@auth/prisma-adapter` |
| Payments | Stripe |
| Email | Resend |
| PDF | `@react-pdf/renderer` |
| Styling | Tailwind CSS |
| Error Tracking | Sentry |
| Testing | Jest |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, forgot/reset password, email verify
│   ├── (dashboard)/     # Authenticated app: invoices, clients, settings
│   ├── api/             # REST API routes
│   │   ├── auth/        # NextAuth + custom auth endpoints
│   │   ├── billing/     # Stripe checkout, portal, subscription
│   │   ├── clients/     # Client CRUD
│   │   ├── invoices/    # Invoice CRUD + send/PDF/reminders
│   │   ├── user/        # Profile + password management
│   │   └── webhooks/    # Stripe webhook handler
│   ├── blog/            # MDX blog
│   ├── invoice/[id]/    # Public invoice view (for clients)
│   └── pricing/         # Public pricing page
├── components/
│   ├── landing/         # Marketing page sections
│   ├── layout/          # Dashboard shell, sidebar, header
│   └── ui/              # Shared UI primitives
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── billing.ts       # Plan feature gates
│   ├── dal/             # Data Access Layer (Prisma queries)
│   ├── email.ts         # Resend email helpers
│   ├── errors.ts        # Typed error helpers
│   ├── pdf/             # PDF template
│   ├── plans.ts         # Plan config (limits, pricing)
│   ├── prisma.ts        # Prisma client singleton
│   ├── rate-limit.ts    # In-memory rate limiting
│   └── stripe.ts        # Stripe client
├── types/
│   └── index.ts         # Shared TypeScript types + helpers
└── middleware.ts         # NextAuth route protection
prisma/
├── schema.prisma         # Database schema
├── migrations/           # SQL migration history
└── seed.ts               # Development seed data
```

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- A PostgreSQL database (local or [Supabase](https://supabase.com) free tier)
- A [Stripe](https://stripe.com) account (test mode)
- A [Resend](https://resend.com) account (free tier)

### 1. Clone and install

```bash
git clone https://github.com/gsdevelopmentromania-jpg/quick-invoice-test2.git
cd quick-invoice-test2
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values. See [Environment Variables](#environment-variables) below.

### 3. Set up the database

```bash
# Run migrations
npm run db:migrate

# (Optional) Seed with example data
npm run db:seed
```

### 4. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 5. Forward Stripe webhooks (optional)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## Docker

A `docker-compose.yml` is provided for running the app and a local PostgreSQL database together:

```bash
# Start app + database
docker compose up

# Also start Stripe CLI webhook forwarding (requires STRIPE_SECRET_KEY in environment)
STRIPE_SECRET_KEY=sk_test_... docker compose --profile stripe up
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:migrate:deploy` | Run Prisma migrations (production) |
| `npm run db:seed` | Seed the database with example data |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run Jest tests |
| `npm run test:ci` | Run tests in CI mode |

---

## Environment Variables

See `.env.example` for the full list with descriptions. The key variables are:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection URL (pooled, for Prisma runtime) |
| `DIRECT_URL` | ✅ | PostgreSQL direct URL (for Prisma migrations) |
| `NEXTAUTH_SECRET` | ✅ | Random secret for NextAuth session signing |
| `NEXTAUTH_URL` | ✅ | Full public URL of the app |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | ✅ | Stripe price ID for the Pro plan |
| `STRIPE_TEAM_PRICE_ID` | ✅ | Stripe price ID for the Team/Enterprise plan |
| `RESEND_API_KEY` | ✅ | Resend API key for transactional email |
| `EMAIL_FROM` | ✅ | Sender address for emails |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Sentry DSN for error tracking |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth credentials |

---

## API Overview

All API routes are under `/api`. Authenticated routes require a valid NextAuth session cookie.

See [`docs/api.md`](docs/api.md) for the full API reference.

### Quick reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/forgot-password` | No | Request password reset |
| `POST` | `/api/auth/reset-password` | No | Reset password with token |
| `POST` | `/api/auth/verify-email` | No | Verify email address |
| `GET` | `/api/invoices` | Yes | List invoices (paginated) |
| `POST` | `/api/invoices` | Yes | Create invoice |
| `GET` | `/api/invoices/[id]` | Yes | Get invoice |
| `PATCH` | `/api/invoices/[id]` | Yes | Update invoice |
| `DELETE` | `/api/invoices/[id]` | Yes | Delete invoice |
| `POST` | `/api/invoices/[id]/send` | Yes | Send invoice to client |
| `POST` | `/api/invoices/[id]/status` | Yes | Update invoice status |
| `GET` | `/api/invoices/[id]/pdf` | Yes | Download PDF (Pro) |
| `POST` | `/api/invoices/[id]/duplicate` | Yes | Duplicate invoice |
| `POST` | `/api/invoices/[id]/reminder` | Yes | Send payment reminder |
| `GET` | `/api/clients` | Yes | List clients (paginated) |
| `POST` | `/api/clients` | Yes | Create client |
| `GET` | `/api/clients/[id]` | Yes | Get client |
| `PATCH` | `/api/clients/[id]` | Yes | Update client |
| `DELETE` | `/api/clients/[id]` | Yes | Delete client |
| `GET` | `/api/user/profile` | Yes | Get user profile |
| `PATCH` | `/api/user/profile` | Yes | Update user profile |
| `POST` | `/api/user/change-password` | Yes | Change password |
| `DELETE` | `/api/user/delete` | Yes | Delete account |
| `GET` | `/api/billing/subscription` | Yes | Get subscription & usage |
| `POST` | `/api/billing/checkout` | Yes | Create Stripe checkout session |
| `POST` | `/api/billing/portal` | Yes | Create Stripe customer portal session |
| `POST` | `/api/billing/upgrade` | Yes | Upgrade subscription |
| `POST` | `/api/billing/cancel` | Yes | Cancel subscription |
| `POST` | `/api/billing/reactivate` | Yes | Reactivate cancelled subscription |
| `POST` | `/api/webhooks/stripe` | Stripe sig | Handle Stripe webhook events |

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for a detailed architecture description.

**High-level overview:**

1. **Next.js App Router** handles both the frontend UI and API routes in the same process.
2. **Middleware** (`src/middleware.ts`) uses NextAuth's `withAuth` to protect all dashboard and API routes.
3. **API routes** validate requests with [Zod](https://zod.dev) schemas, check billing feature gates, and delegate persistence to the **Data Access Layer** (`src/lib/dal/`).
4. **Prisma** provides a type-safe ORM over PostgreSQL (hosted on Supabase). All monetary values are stored as integer cents.
5. **Stripe** handles subscription billing. Webhook events update the database via `/api/webhooks/stripe`.
6. **Resend** delivers transactional emails (verification, invoice delivery, payment reminders).

---

## Plans & Limits

| Plan | Price | Invoices/month | Clients | PDF | Custom branding | Reminders |
|---|---|---|---|---|---|---|
| Free | $0 | 3 | 5 | ❌ | ❌ | ❌ |
| Pro | $12/mo or $99/yr | Unlimited | Unlimited | ✅ | ✅ | ✅ |
| Enterprise | $29/mo or $249/yr | Unlimited | Unlimited | ✅ | ✅ | ✅ |

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# CI mode (no watch, exit on first failure)
npm run test:ci
```

Tests live in `src/__tests__/`. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for testing guidelines.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## License

Private — all rights reserved.
