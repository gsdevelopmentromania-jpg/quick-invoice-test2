# Contributing to Quick Invoice

Thank you for contributing! Please read this guide before opening a pull request.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Branch Strategy](#branch-strategy)
3. [Code Style](#code-style)
4. [TypeScript Guidelines](#typescript-guidelines)
5. [Testing](#testing)
6. [API Routes](#api-routes)
7. [Database Changes](#database-changes)
8. [Commit Messages](#commit-messages)

---

## Development Setup

Follow the [Local Development](README.md#local-development) steps in the README.

### Recommended tools

- **VS Code** with the following extensions:
  - ESLint
  - Prettier – Code formatter
  - Prisma
  - Tailwind CSS IntelliSense

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Protected — PRs only. |
| `dev` | Integration branch for feature work. |
| `feature/<name>` | New features (branch from `dev`). |
| `fix/<name>` | Bug fixes (branch from `dev`). |
| `chore/<name>` | Tooling, dependency updates, non-functional changes. |

Always target `dev` with your pull requests (never push directly to `main`).

---

## Code Style

The project uses **ESLint** and **Prettier** to enforce consistent style. They run automatically on staged files via the CI pipeline.

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all files
npm run format

# Check formatting without modifying files
npm run format:check
```

Key conventions:

- **2-space indentation**
- **Double quotes** for strings
- **Semicolons** required
- **Trailing commas** in multi-line structures
- **Single blank line** between logical blocks
- React component files use `.tsx`; all other TypeScript uses `.ts`

---

## TypeScript Guidelines

- **No implicit `any`** — the TypeScript configuration is `strict: true`. All types must be explicit or properly inferred.
- **Import types from `src/types/index.ts`** — do not redefine types that already exist.
- **Monetary values** — always store as integer cents in the database. Use the `dollarsToCents` / `centsToDollars` helpers from `src/types/index.ts` for conversion.
- **Prisma enums** — import from `@prisma/client`, not redeclared locally.
- **`use client` directive** — add `"use client"` as the very first line of any React component that uses browser hooks (`useState`, `useEffect`, `useCallback`, `useRef`, etc.).
- **Server components** — keep data fetching in server components or API routes; avoid passing raw Prisma models to the client (use plain serialisable objects).

```typescript
// ✅ Good
import { InvoiceStatus } from "@prisma/client";
import type { InvoiceWithClient } from "@/types";

// ❌ Bad — re-declaring what already exists
type InvoiceStatus = "DRAFT" | "SENT" | "PAID";
```

---

## Testing

Tests are written with **Jest** and live in `src/__tests__/`.

```bash
npm test           # run all tests
npm run test:watch # watch mode
npm run test:ci    # CI mode (no watch, exit-first)
```

### Writing tests

- Test files follow the pattern `src/__tests__/<area>/<name>.test.ts`.
- Use the Prisma mock helper in `src/__tests__/helpers/mock-prisma.ts` to avoid real database calls in unit tests.
- Each API route should have:
  - A test for the happy path
  - A test for `401 Unauthorized` when no session exists
  - Tests for validation errors (bad input)
  - Tests for plan-gate enforcement where applicable

```typescript
// Example test structure
describe("GET /api/invoices", () => {
  it("returns 401 when unauthenticated", async () => { ... });
  it("returns paginated invoices for the authenticated user", async () => { ... });
  it("filters by status when status query param is provided", async () => { ... });
});
```

---

## API Routes

All API routes live under `src/app/api/`. Follow these patterns:

### Request validation

Use **Zod** to parse and validate every incoming request body before touching the database:

```typescript
const schema = z.object({ name: z.string().min(1) });
const parsed = schema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.message }, { status: 400 });
}
```

### Authentication

Every protected route must check the session:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Response shape

All API responses follow the `ApiResponse<T>` wrapper from `src/types/index.ts`:

```typescript
// Success
return NextResponse.json({ data: result });

// Error
return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
```

Use the helpers from `src/lib/errors.ts` for common responses:

```typescript
import { unauthorized, serverError } from "@/lib/errors";
```

### Plan feature gates

Check billing limits before creating invoices or clients:

```typescript
import { canCreateInvoice } from "@/lib/billing";

const allowed = await canCreateInvoice(userId, user.plan);
if (!allowed) {
  return NextResponse.json({ error: "Upgrade to Pro..." }, { status: 403 });
}
```

---

## Database Changes

1. Edit `prisma/schema.prisma`.
2. Create a migration:
   ```bash
   npm run db:migrate -- --name describe_your_change
   ```
3. Commit both the updated `schema.prisma` and the generated migration file in `prisma/migrations/`.
4. Update `prisma/seed.ts` if the change requires new seed data.

**Important rules:**

- Never modify existing migration files — always create a new migration.
- Monetary values **must** be stored as integer cents (`Int` type in Prisma).
- Always add appropriate indexes for foreign keys and frequently-queried fields.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.

Examples:

```
feat(invoices): add duplicate invoice endpoint
fix(billing): correct monthly invoice count query
docs: update README setup instructions
chore(deps): bump stripe to 17.3.1
```
