-- =============================================================================
-- Quick Invoice — Supabase Initial Schema Migration
-- =============================================================================
-- This migration creates the full database schema used by the Quick Invoice
-- application.  It is managed by the Supabase CLI and mirrors the Prisma
-- schema defined in prisma/schema.prisma.
--
-- Run with: supabase db push  (or via the Supabase dashboard SQL editor)
-- =============================================================================

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'TEAM');

CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'VIEWED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE "SubscriptionStatus" AS ENUM (
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'UNPAID',
  'TRIALING'
);

-- ─── NextAuth adapter tables ──────────────────────────────────────────────────

CREATE TABLE "accounts" (
    "id"                TEXT        NOT NULL,
    "userId"            TEXT        NOT NULL,
    "type"              TEXT        NOT NULL,
    "provider"          TEXT        NOT NULL,
    "providerAccountId" TEXT        NOT NULL,
    "refresh_token"     TEXT,
    "access_token"      TEXT,
    "expires_at"        INTEGER,
    "token_type"        TEXT,
    "scope"             TEXT,
    "id_token"          TEXT,
    "session_state"     TEXT,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id"           TEXT        NOT NULL,
    "sessionToken" TEXT        NOT NULL,
    "userId"       TEXT        NOT NULL,
    "expires"      TIMESTAMPTZ NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_tokens" (
    "identifier" TEXT        NOT NULL,
    "token"      TEXT        NOT NULL,
    "expires"    TIMESTAMPTZ NOT NULL
);

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE "users" (
    "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "email"            TEXT        NOT NULL,
    "emailVerified"    TIMESTAMPTZ,
    "passwordHash"     TEXT,
    "fullName"         TEXT,
    "businessName"     TEXT,
    "businessAddress"  TEXT,
    "businessPhone"    TEXT,
    "logoUrl"          TEXT,
    "currency"         TEXT        NOT NULL DEFAULT 'USD',
    "locale"           TEXT        NOT NULL DEFAULT 'en-US',
    "stripeCustomerId" TEXT,
    "plan"             "Plan"      NOT NULL DEFAULT 'FREE',
    "planExpiresAt"    TIMESTAMPTZ,
    "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- ─── Password reset tokens ────────────────────────────────────────────────────

CREATE TABLE "password_reset_tokens" (
    "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"    TEXT        NOT NULL,
    "token"     TEXT        NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt"    TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- ─── Clients ─────────────────────────────────────────────────────────────────

CREATE TABLE "clients" (
    "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"    TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "email"     TEXT        NOT NULL,
    "company"   TEXT,
    "address"   TEXT,
    "phone"     TEXT,
    "currency"  TEXT,
    "notes"     TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
-- All monetary values stored as integer cents to avoid floating-point errors.

CREATE TABLE "invoices" (
    "id"                    TEXT            NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"                TEXT            NOT NULL,
    "clientId"              TEXT            NOT NULL,
    "invoiceNumber"         TEXT            NOT NULL,
    "status"                "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency"              TEXT            NOT NULL DEFAULT 'USD',
    "issueDate"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "dueDate"               TIMESTAMPTZ     NOT NULL,
    "notes"                 TEXT,
    "footer"                TEXT,
    "subtotal"              INTEGER         NOT NULL,               -- cents
    "taxRate"               DECIMAL(5, 2),                          -- e.g. 20.00 = 20%
    "taxAmount"             INTEGER         NOT NULL DEFAULT 0,     -- cents
    "discountAmount"        INTEGER         NOT NULL DEFAULT 0,     -- cents
    "total"                 INTEGER         NOT NULL,               -- cents
    "pdfUrl"                TEXT,                                   -- Supabase Storage URL
    "stripePaymentLinkId"   TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt"                TIMESTAMPTZ,
    "sentAt"                TIMESTAMPTZ,
    "viewedAt"              TIMESTAMPTZ,
    "createdAt"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- ─── Line items ───────────────────────────────────────────────────────────────

CREATE TABLE "line_items" (
    "id"          TEXT           NOT NULL DEFAULT gen_random_uuid()::text,
    "invoiceId"   TEXT           NOT NULL,
    "description" TEXT           NOT NULL,
    "quantity"    DECIMAL(10, 2) NOT NULL,
    "unitPrice"   INTEGER        NOT NULL,  -- cents
    "amount"      INTEGER        NOT NULL,  -- cents = quantity * unitPrice
    "sortOrder"   INTEGER        NOT NULL DEFAULT 0,
    CONSTRAINT "line_items_pkey" PRIMARY KEY ("id")
);

-- ─── Payments ─────────────────────────────────────────────────────────────────

CREATE TABLE "payments" (
    "id"                    TEXT            NOT NULL DEFAULT gen_random_uuid()::text,
    "invoiceId"             TEXT            NOT NULL,
    "stripePaymentIntentId" TEXT            NOT NULL,
    "amount"                INTEGER         NOT NULL,  -- cents
    "currency"              TEXT            NOT NULL,
    "status"                "PaymentStatus" NOT NULL,
    "paidAt"                TIMESTAMPTZ,
    "createdAt"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- ─── Subscriptions ────────────────────────────────────────────────────────────

CREATE TABLE "subscriptions" (
    "id"                   TEXT                 NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"               TEXT                 NOT NULL,
    "stripeSubscriptionId" TEXT                 NOT NULL,
    "stripePriceId"        TEXT                 NOT NULL,
    "plan"                 "Plan"               NOT NULL,
    "status"               "SubscriptionStatus" NOT NULL,
    "currentPeriodStart"   TIMESTAMPTZ          NOT NULL,
    "currentPeriodEnd"     TIMESTAMPTZ          NOT NULL,
    "cancelAtPeriodEnd"    BOOLEAN              NOT NULL DEFAULT FALSE,
    "createdAt"            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    "updatedAt"            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- ─── Invoice activity log ─────────────────────────────────────────────────────

CREATE TABLE "invoice_activities" (
    "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "invoiceId" TEXT        NOT NULL,
    "type"      TEXT        NOT NULL,  -- e.g. CREATED, SENT, VIEWED, PAID
    "metadata"  JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "invoice_activities_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- Unique constraints
-- =============================================================================

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key"
    ON "accounts" ("provider", "providerAccountId");

CREATE UNIQUE INDEX "sessions_sessionToken_key"
    ON "sessions" ("sessionToken");

CREATE UNIQUE INDEX "verification_tokens_token_key"
    ON "verification_tokens" ("token");

CREATE UNIQUE INDEX "verification_tokens_identifier_token_key"
    ON "verification_tokens" ("identifier", "token");

CREATE UNIQUE INDEX "users_email_key"
    ON "users" ("email");

CREATE UNIQUE INDEX "users_stripeCustomerId_key"
    ON "users" ("stripeCustomerId");

CREATE UNIQUE INDEX "password_reset_tokens_token_key"
    ON "password_reset_tokens" ("token");

CREATE UNIQUE INDEX "invoices_userId_invoiceNumber_key"
    ON "invoices" ("userId", "invoiceNumber");

CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key"
    ON "payments" ("stripePaymentIntentId");

CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key"
    ON "subscriptions" ("stripeSubscriptionId");

-- =============================================================================
-- Indexes (performance)
-- =============================================================================

CREATE INDEX "clients_userId_idx"          ON "clients"             ("userId");
CREATE INDEX "clients_userId_email_idx"    ON "clients"             ("userId", "email");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens" ("userId");
CREATE INDEX "invoices_userId_idx"         ON "invoices"            ("userId");
CREATE INDEX "invoices_userId_status_idx"  ON "invoices"            ("userId", "status");
CREATE INDEX "invoices_clientId_idx"       ON "invoices"            ("clientId");
CREATE INDEX "invoices_stripePaymentIntentId_idx" ON "invoices"     ("stripePaymentIntentId");
CREATE INDEX "line_items_invoiceId_idx"    ON "line_items"          ("invoiceId");
CREATE INDEX "payments_invoiceId_idx"      ON "payments"            ("invoiceId");
CREATE INDEX "subscriptions_userId_idx"    ON "subscriptions"       ("userId");
CREATE INDEX "invoice_activities_invoiceId_idx" ON "invoice_activities" ("invoiceId");

-- =============================================================================
-- Foreign keys
-- =============================================================================

ALTER TABLE "accounts"
    ADD CONSTRAINT "accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "clients"
    ADD CONSTRAINT "clients_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT;

ALTER TABLE "line_items"
    ADD CONSTRAINT "line_items_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE;

ALTER TABLE "payments"
    ADD CONSTRAINT "payments_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE RESTRICT;

ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "invoice_activities"
    ADD CONSTRAINT "invoice_activities_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE;
