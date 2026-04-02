/**
 * Supplementary database types
 *
 * Extends the base types re-exported from @prisma/client in src/types/index.ts.
 * Import from here when you need Payment, Subscription, InvoiceActivity,
 * PasswordResetToken, or domain-aggregate types not covered by the base types.
 *
 * NOTE: Do NOT re-import types already exported from src/types/index.ts in
 * this file — import them from there to avoid duplication.
 */

import type {
  Payment,
  Subscription,
  InvoiceActivity,
  Client,
  Invoice,
  LineItem,
  User,
} from "@prisma/client";
export type {
  Payment,
  Subscription,
  InvoiceActivity,
} from "@prisma/client";

// ─── PasswordResetToken ───────────────────────────────────────────────────────

/** Server-side password-reset token record. */
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// ─── Composite types ──────────────────────────────────────────────────────────

/** Invoice with its payments attached (e.g. webhook handling). */
export type InvoiceWithPayments = Invoice & {
  payments: Payment[];
};

/** Invoice with line items, client, payments and activity log. */
export type InvoiceFull = Invoice & {
  client: Client;
  lineItems: LineItem[];
  payments: Payment[];
  activities: InvoiceActivity[];
};

/** Subscription with its owning user. */
export type SubscriptionWithUser = Subscription & {
  user: User;
};

// ─── Dashboard statistics ─────────────────────────────────────────────────────

/** Aggregated statistics shown on the user dashboard. */
export interface DashboardStats {
  /** Total revenue from PAID invoices in cents. */
  totalRevenueCents: number;
  /** Revenue collected in the current calendar month (cents). */
  monthlyRevenueCents: number;
  /** Number of invoices currently in SENT or OVERDUE status. */
  outstandingInvoicesCount: number;
  /** Total outstanding amount across unpaid invoices (cents). */
  outstandingAmountCents: number;
  /** Number of distinct clients. */
  totalClients: number;
  /** Total number of invoices (all statuses). */
  totalInvoices: number;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

/** Metadata for a file stored in Supabase Storage. */
export interface StorageFileInfo {
  /** Bucket-relative path, e.g. "userId/invoiceId.pdf". */
  path: string;
  /** Publicly accessible URL. */
  url: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** MIME type, e.g. "application/pdf". */
  mimeType: string;
  /** Upload timestamp (ISO 8601). */
  createdAt: string;
}

// ─── Filter / sort types ──────────────────────────────────────────────────────

/** Possible sort directions for list queries. */
export type SortDirection = "asc" | "desc";

/**
 * Filters accepted when listing invoices from the DAL.
 * All fields are optional; omitting a field means "no filter".
 */
export interface InvoiceFilters {
  status?: Invoice["status"];
  clientId?: string;
  fromDate?: Date;
  toDate?: Date;
  currency?: string;
  search?: string;
}

/** Sort options for invoice list queries. */
export interface InvoiceSortOptions {
  field: "createdAt" | "dueDate" | "total" | "invoiceNumber" | "status";
  direction: SortDirection;
}

/** Filters accepted when listing clients from the DAL. */
export interface ClientFilters {
  search?: string;
  currency?: string;
}

/** Sort options for client list queries. */
export interface ClientSortOptions {
  field: "name" | "createdAt" | "email";
  direction: SortDirection;
}

// ─── Activity log ─────────────────────────────────────────────────────────────

/** Union of all known invoice activity event types. */
export type InvoiceActivityType =
  | "CREATED"
  | "UPDATED"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "REMINDER_SENT"
  | "PDF_GENERATED"
  | "CANCELLED"
  | "DUPLICATED";

/** Typed wrapper around InvoiceActivity with a narrowed `type` field. */
export interface TypedInvoiceActivity extends Omit<InvoiceActivity, "type"> {
  type: InvoiceActivityType;
  metadata: Record<string, unknown> | null;
}
