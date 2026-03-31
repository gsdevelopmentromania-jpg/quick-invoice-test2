import type { Invoice, LineItem, Client, User } from "@prisma/client";

// ─────────────────────────────────────────
// Re-exports from Prisma for convenience
// ─────────────────────────────────────────

export type { Invoice, LineItem, Client, User } from "@prisma/client";
export { InvoiceStatus, Plan, PaymentStatus, SubscriptionStatus } from "@prisma/client";

// ─────────────────────────────────────────
// Composite / enriched types
// ─────────────────────────────────────────

export type InvoiceWithItems = Invoice & {
  lineItems: LineItem[];
};

export type InvoiceWithClient = Invoice & {
  client: Client;
  lineItems: LineItem[];
};

export type UserSafe = Omit<User, never>; // No passwordHash in this schema

// ─────────────────────────────────────────
// Money helpers (values stored as cents in DB)
// ─────────────────────────────────────────

/** Convert cents (integer) to dollars for display */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/** Convert dollars to cents for storage */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// ─────────────────────────────────────────
// API request / response shapes
// ─────────────────────────────────────────

export interface LineItemInput {
  description: string;
  /** Quantity as a decimal (e.g. 2.5 hours) */
  quantity: number;
  /** Unit price in dollars (converted to cents on server) */
  unitPrice: number;
  sortOrder?: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  dueDate: string;         // ISO 8601
  currency?: string;       // ISO 4217, default "USD"
  taxRate?: number;        // percentage e.g. 10 = 10%
  discountAmount?: number; // dollars
  notes?: string;
  footer?: string;
  lineItems: LineItemInput[];
}

export interface UpdateInvoiceInput {
  clientId?: string;
  dueDate?: string;
  currency?: string;
  taxRate?: number;
  discountAmount?: number;
  notes?: string;
  footer?: string;
  lineItems?: LineItemInput[];
}

export interface CreateClientInput {
  name: string;
  email: string;
  company?: string;
  address?: string;
  phone?: string;
  currency?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  company?: string;
  address?: string;
  phone?: string;
  currency?: string;
  notes?: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  currency?: string;
  locale?: string;
  logoUrl?: string;
}

// ─────────────────────────────────────────
// Generic API response wrapper
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─────────────────────────────────────────
// Invoice computed totals (display layer)
// ─────────────────────────────────────────

export interface InvoiceTotals {
  subtotalCents: number;
  taxAmountCents: number;
  discountAmountCents: number;
  totalCents: number;
}
