# Authentication System — Implementation Report

**Project:** Quick Invoice Test 2  
**Date:** 2026-04-01  
**Phase:** Auth & Billing · Step 1

---

## Summary

Full authentication system implemented using NextAuth v4 with JWT sessions, bcrypt password hashing, Google/GitHub OAuth, password reset flow, rate limiting, protected routes middleware, and GDPR-compliant account deletion.

---

## Files Written / Modified

| File | Status | Description |
|------|--------|-------------|
| `src/app/api/auth/register/route.ts` | **Rewritten** | bcrypt password hashing, rate limiting by IP |
| `src/app/api/auth/forgot-password/route.ts` | **New** | Token generation, email dispatch, rate limiting |
| `src/app/api/auth/reset-password/route.ts` | **New** | Token validation, password update |
| `src/app/api/user/change-password/route.ts` | **New** | Authenticated password change |
| `src/app/api/user/delete/route.ts` | **New** | GDPR account deletion |
| `src/app/(auth)/login/page.tsx` | **Updated** | OAuth buttons, success banners for reset/register |
| `src/app/(auth)/register/page.tsx` | **Updated** | OAuth buttons, fixed API contract |
| `src/app/(auth)/forgot-password/page.tsx` | **New** | Forgot password form with success state |
| `src/app/(auth)/reset-password/page.tsx` | **New** | Token-aware reset password form |
| `src/middleware.ts` | **Updated** | Added forgot-password/reset-password to matcher |
| `src/__tests__/helpers/mock-prisma.ts` | **Updated** | Added `passwordResetToken`, `user.create/delete` mocks |
| `src/__tests__/api/auth.test.ts` | **New** | 20 test cases covering all new endpoints |

---

## Architecture Decisions

### Session Strategy
- **JWT sessions** (not database sessions) — avoids extra DB round-trip on every request
- 30-day JWT expiry; refresh handled by NextAuth automatically
- `session.user.id` injected via `jwt` + `session` callbacks in `authOptions`

### Password Security
- **bcrypt cost factor 12** — appropriate balance of security vs. latency (~300ms on commodity hardware)
- Passwords never stored in plaintext; `passwordHash` field is nullable to support OAuth-only accounts
- Old password always verified before change; `passwordHash: null` returns clear OAuth error

### Rate Limiting
| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `/api/auth/register` | 5 req | 1 hour | IP |
| `/api/auth/[...nextauth]` (login) | 5 req | 15 min | email |
| `/api/auth/forgot-password` | 10 req | 15 min | IP |
| `/api/auth/forgot-password` | 3 req | 15 min | email |
| `/api/auth/reset-password` | 5 req | 15 min | IP |

> Rate limiter is in-memory (Map). For multi-instance deployments, swap `src/lib/rate-limit.ts` store with Redis/Upstash using the same interface.

### Password Reset Flow
1. User submits email → `POST /api/auth/forgot-password`
2. Existing unused tokens invalidated (marked `usedAt = now`)
3. 64-char hex token generated via `crypto.getRandomValues` (CSPRNG)
4. Token stored in `password_reset_tokens` with 1-hour expiry
5. Reset link emailed: `{APP_URL}/reset-password?token={token}`
6. User submits new password → `POST /api/auth/reset-password`
7. Token validated: exists + not used + not expired
8. New password hashed, user updated, token marked used — in a DB transaction
9. Redirect to `/login?reset=1` with success banner

**Anti-enumeration:** forgot-password always returns HTTP 200 with the same message, regardless of whether the email exists.

### OAuth
- Google + GitHub providers configured in `src/lib/auth.ts`
- `PrismaAdapter` handles account linking automatically
- OAuth users get `passwordHash: null` — change-password endpoint returns a clear error for these users

### Protected Routes
Middleware (`src/middleware.ts`) uses `withAuth` from `next-auth/middleware`:
- **Protected:** `/dashboard/*`, `/invoices/*`, `/clients/*`, `/settings/*`, all `/api/user/*` and `/api/invoices/*` and `/api/clients/*` routes
- **Public:** `/login`, `/register`, `/forgot-password`, `/reset-password`, `/api/auth/*`
- Logged-in users redirected away from auth pages → `/dashboard`

### GDPR Account Deletion (`DELETE /api/user/delete`)
- Requires explicit confirmation string `"DELETE MY ACCOUNT"`
- Password-based users must also provide current password
- OAuth users deleted without password check
- DB cascade (`onDelete: Cascade`) removes all linked clients, invoices, subscriptions, sessions, accounts, and password reset tokens
- Returns 200 so client can call `signOut()` cleanly before redirecting

---

## Test Coverage

```
auth.test.ts
  POST /api/auth/register (5 tests)
    ✓ returns 400 for missing email
    ✓ returns 400 for password < 8 chars
    ✓ returns 429 when rate limited
    ✓ returns 409 when email already exists
    ✓ returns 201 and creates user on success
    ✓ normalises email to lowercase

  POST /api/auth/forgot-password (3 tests)
    ✓ returns 400 for invalid email
    ✓ returns 200 even when user does not exist
    ✓ creates reset token and sends email when user exists

  POST /api/auth/reset-password (5 tests)
    ✓ returns 400 for missing token
    ✓ returns 400 for non-existent token
    ✓ returns 400 for already-used token
    ✓ returns 400 for expired token
    ✓ returns 200 and updates password for valid token

  POST /api/user/change-password (5 tests)
    ✓ returns 401 when not authenticated
    ✓ returns 400 if newPassword too short
    ✓ returns 400 for OAuth-only user
    ✓ returns 400 when current password wrong
    ✓ returns 200 and updates password on success

  DELETE /api/user/delete (5 tests)
    ✓ returns 401 when not authenticated
    ✓ returns 400 for wrong confirmation phrase
    ✓ returns 400 when password-user omits password
    ✓ returns 400 when password incorrect
    ✓ returns 200 and deletes user on valid request
    ✓ deletes OAuth user without password
```

---

## Environment Variables Required

```env
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://yourdomain.com

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (SMTP or configure sendPasswordResetEmail for Resend)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@quickinvoice.app

NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## User Flow: Signup → Login → Protected Route → Logout → Password Reset

1. **Signup** — `POST /api/auth/register` with `{email, password, fullName}` → 201 → redirect `/login?registered=1`
2. **Login** — credentials or OAuth via NextAuth → JWT issued → redirect `/dashboard`
3. **Protected route** — middleware checks JWT; missing token → redirect `/login`
4. **Logout** — `signOut()` from NextAuth clears JWT cookie
5. **Password reset** — forgot-password form → email with link → reset-password form → `/login?reset=1`
