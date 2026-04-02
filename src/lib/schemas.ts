/**
 * Zod Validation Schemas
 *
 * Centralised validation schemas for all API inputs and form values.
 * Inferred types act as the single source of truth for form state — they are
 * intentionally compatible with (but separate from) the Prisma-derived types
 * in src/types/index.ts.
 *
 * Naming conventions:
 *   - `*Schema`       — the Zod schema object used for .parse() / .safeParse()
 *   - `*FormValues`   — the TypeScript type inferred from the schema
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

/** ISO 4217 3-letter currency code, e.g. "USD", "EUR". */
const currencyCode = z
  .string()
  .length(3, "Currency must be a 3-letter ISO 4217 code (e.g. USD)");

/** ISO 8601 date string accepted from form inputs or API clients. */
const isoDateString = z.string().min(1, "Date is required");

// ─────────────────────────────────────────────────────────────────────────────
// Line Items
// ─────────────────────────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or fewer"),
  quantity: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" })
    .positive("Quantity must be greater than zero")
    .max(10_000, "Quantity exceeds maximum allowed value"),
  unitPrice: z
    .number({ required_error: "Unit price is required", invalid_type_error: "Unit price must be a number" })
    .min(0, "Unit price cannot be negative")
    .max(10_000_000, "Unit price exceeds maximum allowed value"),
  sortOrder: z.number().int("Sort order must be a whole number").min(0).optional(),
});

export type LineItemFormValues = z.infer<typeof lineItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  dueDate: isoDateString,
  currency: currencyCode.optional(),
  taxRate: z
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .optional(),
  discountAmount: z
    .number()
    .min(0, "Discount cannot be negative")
    .optional(),
  notes: z.string().max(2_000, "Notes must be 2,000 characters or fewer").optional(),
  footer: z.string().max(500, "Footer must be 500 characters or fewer").optional(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required")
    .max(100, "An invoice cannot have more than 100 line items"),
});

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required").optional(),
  dueDate: isoDateString.optional(),
  currency: currencyCode.optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().max(2_000).optional(),
  footer: z.string().max(500).optional(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required")
    .max(100)
    .optional(),
});

export type UpdateInvoiceFormValues = z.infer<typeof updateInvoiceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or fewer"),
  email: z.string().email("Invalid email address"),
  company: z.string().max(200, "Company name must be 200 characters or fewer").optional(),
  address: z.string().max(500, "Address must be 500 characters or fewer").optional(),
  phone: z.string().max(50, "Phone number must be 50 characters or fewer").optional(),
  currency: currencyCode.optional(),
  notes: z.string().max(2_000, "Notes must be 2,000 characters or fewer").optional(),
});

export type CreateClientFormValues = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();

export type UpdateClientFormValues = z.infer<typeof updateClientSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// User Profile
// ─────────────────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: z.string().max(200, "Name must be 200 characters or fewer").optional(),
  businessName: z.string().max(200, "Business name must be 200 characters or fewer").optional(),
  businessAddress: z
    .string()
    .max(500, "Business address must be 500 characters or fewer")
    .optional(),
  businessPhone: z.string().max(50, "Phone number must be 50 characters or fewer").optional(),
  currency: currencyCode.optional(),
  locale: z.string().max(20, "Locale identifier too long").optional(),
  logoUrl: z.string().url("Logo URL must be a valid URL").optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: passwordField,
    confirmPassword: z.string(),
    fullName: z
      .string()
      .min(1, "Name is required")
      .max(200, "Name must be 200 characters or fewer"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordField,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Query / Filter Params
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query parameters accepted by GET /api/invoices.
 * Validated server-side before forwarding to the DAL.
 */
export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z
    .enum(["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"])
    .optional(),
  clientId: z.string().optional(),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

/**
 * Query parameters accepted by GET /api/clients.
 */
export const listClientsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().max(200).optional(),
});

export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
