# Architecture — Quick Invoice

> Authoritative reference for all agents and developers working on this project.
> Follow these constraints strictly. Deviations will break the build.

---

## 1. Router

**Next.js App Router ONLY — do NOT create a `pages/` directory.**

- All routes live under `src/app/`.
- Route groups (e.g. `(auth)`, `(dashboard)`) are used for layout sharing without affecting the URL.
- Dynamic segments use `[param]` folder naming (e.g. `src/app/invoices/[id]/`).
- Catch-all API routes use `[...param]` (e.g. `src/app/api/auth/[...nextauth]/route.ts`).

---

## 2. TypeScript

**Strict mode enabled — all types must be explicit, no implicit `any`.**

- `tsconfig.json` has `"strict": true`.
- `target` is `ES2017` — do **not** use features above ES2017 (no `Object.fromEntries`, no `Array.flat/flatMap`, no regex `/s` flag).
- Path alias `@/*` maps to `./src/*` — always import using `@/` instead of relative `../../` paths.
- All function parameters, return types, and exported values must have explicit TypeScript types.
- No `as any` casts — use proper generics or type narrowing.

---

## 3. Folder Structure

```
/
├── prisma/                  # Prisma schema, migrations, seed
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/                  # Static assets (images, fonts, og-image.png, logo.png)
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── (auth)/          # Auth route group — login, register, forgot-password, etc.
│   │   ├── (dashboard)/     # Dashboard route group — invoices, clients, settings
│   │   ├── api/             # API routes (route.ts files only)
│   │   ├── blog/            # MDX blog pages
│   │   ├── invoice/         # Public invoice view (no auth required)
│   │   ├── pricing/
│   │   ├── status/
│   │   ├── layout.tsx       # Root layout (no hooks — Server Component)
│   │   ├── page.tsx         # Landing page
│   │   ├── globals.css      # Tailwind base + design tokens
│   │   ├── error.tsx        # Root error boundary
│   │   ├── not-found.tsx
│   │   ├── loading.tsx
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── analytics/       # Analytics provider components
│   │   ├── landing/         # Marketing/landing page components
│   │   ├── layout/          # Shell, sidebar, header
│   │   ├── seo/             # JSON-LD structured data
│   │   ├── ui/              # Reusable primitive UI components (button, card, input, etc.)
│   │   ├── providers.tsx    # Client providers (ThemeProvider, SessionProvider, etc.)
│   │   └── error-boundary.tsx
│   ├── hooks/               # Custom React hooks (all files must be client-side)
│   ├── lib/
│   │   ├── dal/             # Data Access Layer — Prisma query wrappers
│   │   ├── auth.ts          # NextAuth config
│   │   ├── billing.ts       # Stripe helpers
│   │   ├── email.ts         # Resend email helpers
│   │   ├── errors.ts        # Typed error classes
│   │   ├── health.ts        # Health-check logic
│   │   ├── logger.ts        # Structured logger
│   │   ├── monitoring.ts    # Sentry / observability helpers
│   │   ├── pdf/             # React-PDF invoice renderer
│   │   ├── plans.ts         # Billing plan definitions
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── rate-limit.ts    # API rate limiting
│   │   ├── seo.ts           # SEO metadata helpers
│   │   ├── stripe.ts        # Stripe client singleton
│   │   └── utils.ts         # Shared utility functions (cn, formatCurrency, formatDate, truncate)
│   ├── middleware.ts         # Next.js edge middleware (auth guards)
│   └── types/
│       ├── index.ts         # Shared domain types (Invoice, Client, User, etc.)
│       ├── blog.ts          # Blog-specific types
│       └── next-auth.d.ts   # NextAuth session type augmentation
├── ARCHITECTURE.md          # ← this file
├── .env.example             # Environment variable documentation
├── .gitignore
├── next.config.mjs          # Next.js config (MDX + Sentry)
├── tailwind.config.ts       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── tsconfig.json            # TypeScript config (strict, ES2017, path aliases)
├── package.json
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── jest.setup.js
└── instrumentation.ts       # OpenTelemetry / Sentry instrumentation hook
```

---

## 4. Component Rules

**All components using hooks (`useState`, `useEffect`, `useCallback`, `useRef`, `useContext`, etc.) MUST have `'use client'` as the very first line of the file.**

- Server Components are the default in the App Router — do NOT add `'use client'` unless hooks or browser APIs are required.
- `providers.tsx` — must be `'use client'` (wraps `ThemeProvider`, `SessionProvider`).
- `error.tsx` files — must be `'use client'` (Next.js requirement).
- All files in `src/hooks/` are client-only.
- Never import a Client Component directly into a Server Component's render tree if it causes an `async` mismatch — use a wrapper instead.

---

## 5. Config Files

| Purpose | Filename |
|---|---|
| Next.js config | `next.config.mjs` (**NOT** `.ts` — Next.js 14 does not support `.ts`) |
| Tailwind CSS | `tailwind.config.ts` |
| PostCSS | `postcss.config.js` |
| TypeScript | `tsconfig.json` |
| ESLint | `.eslintrc.json` |
| Prettier | `.prettierrc` |
| Jest | `jest.config.js` |
| Prisma | `prisma/schema.prisma` |

---

## 6. Styling

- **Tailwind CSS v3** — utility-first. All custom design tokens are defined in `tailwind.config.ts`.
- **globals.css** is located at `src/app/globals.css`. It is imported once in `src/app/layout.tsx`.
- Tailwind directives (`@tailwind base/components/utilities`) are in `globals.css`.
- CSS custom properties (design tokens) are defined in `@layer base` inside `globals.css` — both `:root` (light) and `.dark` variants.
- Dark mode is controlled via the `class` strategy (`darkMode: 'class'` in `tailwind.config.ts`), toggled by `next-themes`.
- Do **not** use inline `style=` props for anything covered by Tailwind utilities.
- Use the `cn()` helper from `@/lib/utils` to merge conditional class names.
- Brand colour scale: `brand-50` → `brand-950` (indigo-based) defined in `tailwind.config.ts`.

---

## 7. Data Layer

- **ORM**: Prisma v5 with a PostgreSQL database hosted on **Supabase**.
- **Prisma client singleton**: imported from `@/lib/prisma` — never instantiate `PrismaClient` directly in routes or components.
- **Data Access Layer (DAL)**: all database queries are encapsulated in `src/lib/dal/` modules:
  - `dal/invoices.ts` — invoice CRUD
  - `dal/clients.ts` — client CRUD
  - `dal/users.ts` — user profile queries
  - `dal/billing.ts` — subscription state queries
  - `dal/index.ts` — barrel re-export
- **Never** query Prisma directly from React components or API route handlers — always go through the DAL.
- **Connection URLs**: use `DATABASE_URL` (pooled, via pgBouncer) for runtime and `DIRECT_URL` for migrations. Both are defined in `.env.example`.
- **Migrations**: run with `prisma migrate dev` (local) or `prisma migrate deploy` (CI/production).
- **Type safety**: Prisma generates types automatically — import from `@prisma/client`. Do NOT manually re-define Prisma model types.

---

## 8. API Routes

- All API routes live under `src/app/api/` and use **`route.ts`** files (not `route.js`).
- Each handler exports named HTTP method functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Route pattern examples:
  ```
  src/app/api/invoices/route.ts          → GET /api/invoices, POST /api/invoices
  src/app/api/invoices/[id]/route.ts     → GET /api/invoices/:id, PATCH /api/invoices/:id, DELETE /api/invoices/:id
  src/app/api/auth/[...nextauth]/route.ts → NextAuth catch-all
  src/app/api/webhooks/stripe/route.ts   → Stripe webhook receiver
  ```
- All handlers must validate request bodies with **Zod** before touching the database.
- Authentication is checked via `getServerSession(authOptions)` from `@/lib/auth` at the top of every protected handler.
- Rate limiting is applied via `@/lib/rate-limit` on all mutation endpoints.
- Errors are thrown using typed error classes from `@/lib/errors` and caught by a consistent response shape.
- **No** business logic in route files — delegate to DAL and service helpers in `lib/`.
