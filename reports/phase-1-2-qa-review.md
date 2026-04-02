# QA Review — Phase 1 & 2 Deliverables
**Branch:** feature/fix-critical-gaps  
**Date:** 2026-04-02  
**Reviewer:** Aegis (QA Manager)  
**Overall Status:** ⚠️ CONDITIONAL PASS — 3 issues require attention before merge

---

## 1. Invoice Detail Page
**File:** `src/app/(dashboard)/invoices/[id]/page.tsx`

| Check | Result |
|---|---|
| File exists | ✅ |
| Real page (not stub) | ✅ 33 KB full implementation |
| Fetches data | ✅ `useEffect` + `fetch('/api/invoices/[id]')` |
| Loading/error states | ✅ `Skeleton` / `SkeletonText` components used |
| Action buttons by status | ✅ Present (`"use client"`, status-conditional rendering) |

**Verdict: PASS**

---

## 2. Public Invoice Page
**File:** `src/app/invoice/[id]/page.tsx`

| Check | Result |
|---|---|
| File exists | ✅ |
| No auth guard | ✅ Server component, no `getServerSession` |
| Displays invoice info | ✅ Full line-item table, totals, client/sender branding |
| Payment button present | ✅ `<a href={paymentUrl}>Pay Now</a>` rendered when `paymentUrl` is set |
| Paid / cancelled states handled | ✅ Conditional UI per status |
| `thank-you/page.tsx` exists | ✅ `src/app/invoice/[id]/thank-you/page.tsx` |
| Public API route exists | ✅ `src/app/api/invoice/[id]/route.ts` — GET, no auth required |

**Verdict: PASS**

---

## 3. Invoice Edit Page
**File:** `src/app/(dashboard)/invoices/[id]/edit/page.tsx`

| Check | Result |
|---|---|
| File exists | ✅ |
| Real page (not stub) | ✅ 27 KB full implementation |
| Pre-populates form fields | ✅ `useEffect` fetches invoice and sets form state |
| DRAFT-only editing enforced | ✅ Checked in the edit handler; non-DRAFT invoices show read-only view |

**Verdict: PASS**

---

## 4. Email Delivery
**File:** `src/lib/email.ts` + send/reminder/webhook routes

| Check | Result |
|---|---|
| `sendInvoiceEmail` implemented | ✅ Full HTML email via nodemailer SMTP |
| `sendPasswordResetEmail` implemented | ✅ |
| `sendEmailVerificationEmail` implemented | ✅ |
| `sendReminderEmail` implemented | ❌ **MISSING** — function does not exist in `src/lib/email.ts` |
| `sendTrialEndingEmail` implemented | ❌ **MISSING** — function does not exist in `src/lib/email.ts` |
| TODO in send route | ❌ `src/app/api/invoices/[id]/send/route.ts` line: `// TODO: Send email via Resend` — email never sent on invoice dispatch |
| TODO in reminder route | ❌ `src/app/api/invoices/[id]/reminder/route.ts` — reminder email call is **commented out**, activity logged but no email fires |
| TODO in webhook | ⚠️ `src/app/api/webhooks/stripe/route.ts` `trial_will_end` handler — `// TODO: send trial-ending email` |
| Error handling non-blocking | ✅ (where wired up) |

**Issues found:**

### Issue 4a — `sendReminderEmail` missing
**File:** `src/lib/email.ts`  
**Problem:** The reminder route imports `sendReminderEmail` in its comment but the function is not exported from `src/lib/email.ts`. Calling the currently-commented code would throw a compile error.  
**Severity:** High

### Issue 4b — Send route doesn't dispatch email
**File:** `src/app/api/invoices/[id]/send/route.ts`, end of POST handler  
```ts
// TODO: Send email via Resend (src/lib/email.ts)
```
`sendInvoiceEmail` IS implemented in `src/lib/email.ts` — it just needs to be called. The invoice goes SENT + Stripe link is created, but the client never receives the email.  
**Severity:** Critical

### Issue 4c — Reminder route doesn't dispatch email
**File:** `src/app/api/invoices/[id]/reminder/route.ts`  
```ts
// TODO: Send reminder email via Resend (src/lib/email.ts)
// await sendReminderEmail({ invoice, client: invoice.client });
```
Call is commented out; `sendReminderEmail` also doesn't exist yet.  
**Severity:** Critical

### Issue 4d — Trial-ending webhook fires no email
**File:** `src/app/api/webhooks/stripe/route.ts`, `customer.subscription.trial_will_end` case  
```ts
// TODO: send trial-ending email via @/lib/email
```
Only logs to console. No email sent.  
**Severity:** Medium

**Verdict: FAIL — email delivery is partially implemented**

---

## 5. Client Detail Page
**File:** `src/app/(dashboard)/clients/[id]/page.tsx`

| Check | Result |
|---|---|
| File exists | ✅ |
| Real page (not stub) | ✅ 39 KB full implementation |
| Client info displayed | ✅ Name, email, address, phone rendered |
| Invoice history displayed | ✅ Fetches and lists client's invoices with status badges |

**Verdict: PASS**

---

## 6. CI/CD Workflows
**Expected location:** `.github/workflows/`  
**Actual location:** `github-workflows/`

| Check | Result |
|---|---|
| `ci.yml` syntactically valid | ✅ |
| `deploy.yml` syntactically valid | ✅ |
| Files in `.github/workflows/` | ❌ **FAIL — files are in `github-workflows/`, not `.github/workflows/`** |
| `.github/` contains workflows | ❌ Only `.github/README.md` exists |

### Issue 6a — Workflows in wrong directory — CI/CD will never trigger
**File:** `github-workflows/ci.yml`, `github-workflows/deploy.yml`  
**Problem:** GitHub Actions only picks up workflow files from the `.github/workflows/` directory. Files in `github-workflows/` are ignored entirely — no CI runs on push/PR, no deployment on merge to main.  
**Fix:** Copy both files to `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.  
**Severity:** Critical — no CI/CD is running on this repo

---

## Summary of Findings

| Area | Status | Severity |
|---|---|---|
| Invoice Detail Page | ✅ PASS | — |
| Public Invoice Page | ✅ PASS | — |
| Invoice Edit Page | ✅ PASS | — |
| Email: `sendInvoiceEmail` | ✅ Implemented | — |
| Email: send route wired | ❌ TODO remaining | Critical |
| Email: `sendReminderEmail` missing | ❌ Not implemented | High |
| Email: reminder route wired | ❌ TODO remaining | Critical |
| Email: trial-ending email | ⚠️ TODO remaining | Medium |
| Client Detail Page | ✅ PASS | — |
| CI/CD — correct directory | ❌ Wrong path | Critical |

---

## Required Actions Before Merge

1. **Wire `sendInvoiceEmail` into the send route**  
   `src/app/api/invoices/[id]/send/route.ts` — replace the `// TODO` with a call to `sendInvoiceEmail(...)` from `@/lib/email`. Wrap in `try/catch` so email failure doesn't block the API response.

2. **Implement `sendReminderEmail` and wire it into the reminder route**  
   Add `sendReminderEmail` to `src/lib/email.ts` (mirrors `sendInvoiceEmail`). Then uncomment/replace the `// TODO` in `src/app/api/invoices/[id]/reminder/route.ts`.

3. **Move workflow files to `.github/workflows/`**  
   Copy `github-workflows/ci.yml` → `.github/workflows/ci.yml`  
   Copy `github-workflows/deploy.yml` → `.github/workflows/deploy.yml`  
   The `github-workflows/` copies can remain for reference but GitHub will only read from `.github/workflows/`.

4. *(Medium)* Implement `sendTrialEndingEmail` in `src/lib/email.ts` and call it from the `customer.subscription.trial_will_end` webhook handler.
