# Authentication System Implementation

**Date:** 2026-04-01
**Project:** Quick Invoice Test 2
**Phase:** Auth & Billing → Step 1 (Authentication)

---

## Overview

Full authentication system implemented using NextAuth v4 with JWT sessions, bcrypt password hashing, email verification, and GDPR-compliant account deletion.

---

## What Was Built

### 1. Schema Changes (`prisma/schema.prisma`)

Added to `User` model:
- `emailVerified DateTime?` — required by NextAuth adapter for OAuth
- `passwordHash String?` — stores bcrypt-hashed passwords for credentials auth

New model: `PasswordResetToken`
- Stores one-time password reset tokens with expiry and used-at tracking
- Cascades on user deletion

New migration: `prisma/migrations/20260401000001_add_auth_fields/`

---

### 2. Rate Limiting (`src/lib/rate-limit.ts`)

Simple sliding-window in-memory rate limiter.

| Endpoint | Limit |
|----------|-------|
| Login (per email) | 5 attempts / 15 min |
| Signup (per IP) | 5 registrations / 1 hr |
| Forgot password (per IP) | 10 requests / 1 hr |
| Forgot password (per email) | 3 requests / 1 hr |
| Reset password (per IP) | 10 requests / 1 hr |

> For multi-instance production deployments, replace the Map store with Redis (Upstash recommended).

---

### 3. Email/Password Auth (`src/lib/auth.ts`)

Fixed `CredentialsProvider.authorize()`:
- Normalizes email to lowercase
- Applies rate limiting before DB lookup
- Verifies password with `bcrypt.compare()`
- Returns user object on success; `null` on failure; throws on rate limit exceeded

---

### 4. Registration (`src/app/api/auth/register/route.ts`)

`POST /api/auth/register`
- Validates email + password (min 8 chars) + optional fullName
- Rate-limited by IP
- Creates user with `bcrypt.hash(password, 12)`
- Generates 32-byte hex verification token, stores in `verification_tokens`
- Sends verification email via `sendEmailVerificationEmail()`
- Returns `201` for both new and existing emails (prevents user enumeration)

---

### 5. Email Verification

**API:** `GET /api/auth/verify-email?token=xxx&email=user@example.com`
- Looks up token in `verification_tokens`
- Validates expiry (24-hour window)
- Sets `user.emailVerified = now()` in a transaction
- Deletes used token

**Page:** `src/app/(auth)/verify-email/page.tsx`
- Calls API on mount, shows loading to success or error state

---

### 6. Password Reset

**Request:** `POST /api/auth/forgot-password`
- Rate-limited (per IP + per email)
- Invalidates any existing unexpired tokens
- Creates new `PasswordResetToken` (1-hour expiry)
- Sends reset email; always returns 200 (no enumeration)

**Reset:** `POST /api/auth/reset-password`
- Validates token exists, not used, not expired
- Hashes new password with bcrypt
- Updates `user.passwordHash` and marks token as used in transaction

**Pages:**
- `src/app/(auth)/forgot-password/page.tsx` — email input form
- `src/app/(auth)/reset-password/page.tsx` — new password form (reads token from URL)

---

### 7. OAuth (Google and GitHub)

Already configured via NextAuth providers. Login and register pages now include OAuth buttons with proper `signIn("google")` / `signIn("github")` calls.

---

### 8. Session Management

- Strategy: `jwt` with 30-day maxAge
- JWT callback stores `user.id` in token
- Session callback exposes `session.user.id`
- NextAuth handles token refresh automatically

---

### 9. Protected Routes (`src/middleware.ts`)

Updated matcher to include:
- `/forgot-password`, `/reset-password`, `/verify-email` — public (auth pages)
- All dashboard, API routes — require valid JWT token

Auth pages redirect logged-in users to `/dashboard`.

---

### 10. User Profile API (`src/app/api/user/profile/route.ts`)

Added `DELETE /api/user/profile`:
- Requires `{ confirmEmail }` in body
- Matches against `user.email` (case-insensitive)
- Calls `prisma.user.delete()` which cascades to clients, invoices, subscriptions, sessions, accounts

---

### 11. Change Password (`src/app/api/user/change-password/route.ts`)

`POST /api/user/change-password`
- Requires active session
- Verifies `currentPassword` against stored hash
- Rejects OAuth-only accounts (no `passwordHash`)
- Updates hash with new bcrypt-hashed password

---

### 12. Email Module (`src/lib/email.ts`)

Added `sendEmailVerificationEmail()` alongside existing `sendPasswordResetEmail()`.

---

## Files Written

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Added `emailVerified`, `passwordHash`, `PasswordResetToken` |
| `prisma/migrations/20260401000001_add_auth_fields/migration.sql` | DB migration |
| `src/lib/rate-limit.ts` | In-memory rate limiter |
| `src/lib/auth.ts` | Fixed CredentialsProvider with bcrypt + rate limiting |
| `src/lib/email.ts` | Added `sendEmailVerificationEmail` |
| `src/app/api/auth/register/route.ts` | Full email/password signup |
| `src/app/api/auth/verify-email/route.ts` | Email verification endpoint |
| `src/app/api/auth/forgot-password/route.ts` | Password reset request |
| `src/app/api/auth/reset-password/route.ts` | Password reset completion |
| `src/app/api/user/profile/route.ts` | Added DELETE (account deletion) |
| `src/app/api/user/change-password/route.ts` | Password change endpoint |
| `src/app/(auth)/forgot-password/page.tsx` | Forgot password UI |
| `src/app/(auth)/reset-password/page.tsx` | Reset password UI |
| `src/app/(auth)/verify-email/page.tsx` | Email verification UI |
| `src/app/(auth)/login/page.tsx` | Updated with OAuth buttons + banners |
| `src/app/(auth)/register/page.tsx` | Updated with OAuth buttons + success state |
| `src/middleware.ts` | Updated matchers for new auth pages |
| `src/__tests__/helpers/mock-prisma.ts` | Added verificationToken + passwordResetToken mocks |
| `src/__tests__/api/auth.test.ts` | Auth system test suite (22 tests) |

---

## Security Decisions

1. **No email enumeration** — Register and forgot-password always return 200
2. **bcrypt cost factor 12** — ~300ms hashing, brute-force resistant
3. **Lowercase email normalization** — Prevents duplicate accounts via case variation
4. **Token invalidation** — Existing reset tokens invalidated before issuing new one
5. **One-time tokens** — Marked `usedAt` on first use, rejected on reuse
6. **Cascading deletes** — All user data removed atomically via Prisma `onDelete: Cascade`
7. **Email confirmation for deletion** — Prevents accidental or CSRF-triggered deletion
