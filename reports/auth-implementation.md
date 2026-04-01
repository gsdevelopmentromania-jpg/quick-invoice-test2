# Authentication System — Implementation Report

**Project:** Quick Invoice Test 2
**Date:** 2026-04-01
**Phase:** Auth & Billing → Step 1

---

## Overview

A complete, production-ready authentication system has been implemented using
**NextAuth v4** with JWT session strategy. All seven requirements from the task
specification are satisfied.

---

## Architecture Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Session strategy | JWT (stateless) | No DB session table required; scales horizontally |
| Password hashing | bcryptjs, 12 rounds | Battle-tested; OWASP-recommended cost factor |
| OAuth | Google + GitHub | NextAuth providers; zero custom OAuth code |
| Rate limiting | In-memory sliding window | Zero infrastructure; swap for Redis/Upstash in production |
| Email delivery | Nodemailer (SMTP) | Config-driven; swap transport for Resend/SES without API changes |
| Token storage | DB rows (PasswordResetToken, VerificationToken) | Single-use, expiring, invalidatable |

---

## Files Written / Modified

### Core Auth Config

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth options: Google, GitHub, Credentials providers; JWT callbacks |
| `src/types/next-auth.d.ts` | Extends `Session` and `JWT` types with `user.id` |
| `src/middleware.ts` | `withAuth` middleware protecting all `/dashboard/*`, `/invoices/*`, `/clients/*`, `/settings/*`, `/api/invoices/*`, `/api/clients/*`, `/api/user/*` routes |

### Auth API Routes

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler (login, OAuth callbacks, session) |
| `/api/auth/register` | POST | Email/password signup; creates VerificationToken; fires verification email |
| `/api/auth/verify-email` | GET | Validates token + email param; sets `emailVerified`; deletes token |
| `/api/auth/resend-verification` | POST | Issues fresh token for unverified accounts |
| `/api/auth/forgot-password` | POST | Creates PasswordResetToken; sends reset email; prevents enumeration |
| `/api/auth/reset-password` | POST | Validates token; hashes new password; marks token used |

### User Profile Routes

| Route | Methods | Description |
|---|---|---|
| `/api/user/profile` | GET, PATCH, DELETE | Read / update / delete (GDPR) account |
| `/api/user/change-password` | POST | Verify current password; update hash |
| `/api/user/delete` | DELETE | Requires confirmation phrase + password; cascades all user data |

### Auth Pages

| Page | Path |
|---|---|
| Login | `/login` |
| Register | `/register` |
| Forgot password | `/forgot-password` |
| Reset password | `/reset-password?token=...` |
| Verify email | `/verify-email?token=...&email=...` |

---

## Feature Coverage

### 1. Email/Password Auth
- Signup at `POST /api/auth/register`
- Password hashed with bcrypt (12 rounds)
- Email verification token created and emailed on signup
- Verification at `GET /api/auth/verify-email`
- Resend at `POST /api/auth/resend-verification`

### 2. OAuth (Google + GitHub)
- Configured via `GoogleProvider` and `GithubProvider` in `src/lib/auth.ts`
- `PrismaAdapter` stores OAuth accounts in the `accounts` table
- Callback URL: `/dashboard`

### 3. Session Management
- JWT strategy, 30-day maxAge
- `session.user.id` injected via `jwt` + `session` callbacks
- `next-auth/middleware` (`withAuth`) validates JWTs on every protected request

### 4. Protected Routes
The middleware matcher covers:
```
/login, /register, /forgot-password, /reset-password
/dashboard/:path*, /invoices/:path*, /clients/:path*, /settings/:path*
/api/invoices/:path*, /api/clients/:path*, /api/user/:path*
```
Logged-in users are redirected away from auth pages to `/dashboard`.

### 5. User Profile
- `GET /api/user/profile` — returns full profile
- `PATCH /api/user/profile` — updates name, business info, currency, locale, avatar URL
- Password change at `POST /api/user/change-password` (current password required; OAuth accounts blocked)

### 6. Account Deletion (GDPR)
Two complementary deletion endpoints:
- `DELETE /api/user/profile` — confirm with email address
- `DELETE /api/user/delete` — confirm with phrase `"DELETE MY ACCOUNT"` + password
  
Both cascade-delete clients, invoices, subscriptions, OAuth accounts, and sessions via Prisma `onDelete: Cascade`.

### 7. Rate Limiting

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| Login (via NextAuth) | 5 attempts | 15 min | `login:<email>` |
| Register | 5 attempts | 1 hour | `signup:<ip>` |
| Forgot password | 10 / IP, 3 / email | 1 hour each | `forgot-ip:<ip>`, `forgot-email:<email>` |
| Reset password | 5 attempts | 15 min | `reset-password:<ip>` |
| Resend verification | 3 / IP, 3 / email | 1 hour each | `resend-verification:<ip>`, `resend-verification-email:<email>` |

> **Production note:** The in-memory rate limiter resets on process restart.
> Replace the `Map` store in `src/lib/rate-limit.ts` with Upstash Redis for
> stateless / multi-replica deployments.

---

## Database Schema

The following Prisma models support auth:

- **User** — `passwordHash`, `emailVerified`, `plan`, `stripeCustomerId`
- **Account** — NextAuth OAuth accounts (`@auth/prisma-adapter`)
- **Session** — NextAuth DB sessions (currently unused — JWT strategy)
- **VerificationToken** — NextAuth email verification (`identifier` + `token` + `expires`)
- **PasswordResetToken** — Custom single-use reset tokens with `usedAt` field

All models cascade-delete on `User` deletion.

---

## Tests

File: `src/__tests__/api/auth.test.ts`

| Suite | Cases |
|---|---|
| `POST /api/auth/register` | rate limit, invalid email, short password, duplicate (returns 201 to prevent enumeration), success (creates user + token + sends email), email normalisation |
| `GET /api/auth/verify-email` | missing params, unknown token, mismatched identifier, expired token (deleted), success |
| `POST /api/auth/resend-verification` | rate limit, invalid email, user not found (silent), already verified (silent), success |
| `POST /api/auth/forgot-password` | rate limit, invalid email, user not found (silent), OAuth user (silent), success (token created + email sent), invalidates previous tokens |
| `POST /api/auth/reset-password` | rate limit, missing token, short password, unknown token, used token, expired token, success |
| `POST /api/user/change-password` | unauthenticated, short new password, OAuth user, wrong current password, success |
| `DELETE /api/user/delete` | unauthenticated, wrong phrase, missing password, wrong password, success (password user), success (OAuth user) |

---

## Environment Variables Required

```env
NEXTAUTH_SECRET=<strong-random-secret>
NEXTAUTH_URL=https://your-domain.com

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

NEXT_PUBLIC_APP_URL=https://your-domain.com

# Email (Nodemailer SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=noreply@your-domain.com
```

---

## Security Notes

- Passwords never logged or returned in API responses
- Forgot-password and register always return 200/201 for valid requests to prevent user enumeration
- Reset tokens are single-use (marked `usedAt`) and expire in 1 hour
- Verification tokens expire in 24 hours
- OAuth account deletion does not require a password
- All monetary fields unrelated to auth use integer cents to avoid float issues
