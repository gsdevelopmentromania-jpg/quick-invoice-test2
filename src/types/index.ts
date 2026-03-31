import type { Invoice, LineItem, Client, User } from "@prisma/client";

// ─────────────────────────────────────────
// Re-exports from Prisma for convenience
// ─────────────────────────────────────────

export type { Invoice, LineItem, Client, User } from "@prisma/client";
export { InvoiceStatus, Plan } from "@prisma/client";

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

export type UserWithRelations = User & {
  invoices: Invoice[];
  clients: Client[];
};

// ─────────────────────────────────────────
// API request / response shapes
// ─────────────────────────────────────────

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  dueDate: string;
  currency?: string;
  taxRate?: number;
  notes?: string;
  terms?: string;
  lineItems: LineItemInput[];
}

export interface UpdateInvoiceInput {
  clientId?: string;
  dueDate?: string;
  currency?: string;
  taxRate?: number;
  notes?: string;
  terms?: string;
  lineItems?: LineItemInput[];
}

export interface CreateClientInput {
  name: string;
  email: string;
  company?: string;
  address?: string;
  phone?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  company?: string;
  address?: string;
  phone?: string;
  notes?: string;
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
  pageSize: number;
  totalPages: number;
}

// ─────────────────────────────────────────
// Invoice computed helpers
// ─────────────────────────────────────────

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}
