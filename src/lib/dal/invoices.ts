/**
 * Invoice Data Access Layer
 *
 * Encapsulates invoice business logic:
 *  - Invoice number generation
 *  - Total / tax / discount calculation (all values stored as cents)
 *  - Ownership-scoped CRUD
 *  - Activity logging within transactions
 */

import prisma from "@/lib/prisma";
import { dollarsToCents } from "@/types";
import type { InvoiceWithClient, CreateInvoiceInput, UpdateInvoiceInput, InvoiceTotals } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate the next sequential invoice number for a user, e.g. "INV-0042".
 * NOTE: count-based generation is safe for low concurrency. For high-volume
 * production use, consider a dedicated sequence table with a DB transaction.
 */
export async function generateInvoiceNumber(userId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { userId } });
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Calculate invoice totals from line items.
 * All monetary inputs in dollars; all outputs in cents.
 */
export function computeTotals(
  lineItems: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number,
  discountDollars: number
): InvoiceTotals {
  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + dollarsToCents(item.quantity * item.unitPrice),
    0
  );
  const discountAmountCents = dollarsToCents(discountDollars);
  const taxableCents = subtotalCents - discountAmountCents;
  const taxAmountCents = Math.round(taxableCents * (taxRate / 100));
  const totalCents = taxableCents + taxAmountCents;

  return { subtotalCents, taxAmountCents, discountAmountCents, totalCents };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListInvoicesOptions {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
}

export interface PaginatedInvoices {
  data: InvoiceWithClient[];
  total: number;
  page: number;
  limit: number;
}

export async function getInvoice(
  userId: string,
  invoiceId: string
): Promise<InvoiceWithClient | null> {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { client: true, lineItems: true },
  }) as Promise<InvoiceWithClient | null>;
}

export async function listInvoices(
  userId: string,
  options: ListInvoicesOptions = {}
): Promise<PaginatedInvoices> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));

  const where = {
    userId,
    ...(options.status ? { status: options.status as InvoiceWithClient["status"] } : {}),
    ...(options.clientId ? { clientId: options.clientId } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true, lineItems: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data: invoices as InvoiceWithClient[], total, page, limit };
}

export async function createInvoice(
  userId: string,
  input: CreateInvoiceInput
): Promise<InvoiceWithClient> {
  const invoiceNumber = await generateInvoiceNumber(userId);
  const totals = computeTotals(
    input.lineItems,
    input.taxRate ?? 0,
    input.discountAmount ?? 0
  );

  const invoice = await prisma.invoice.create({
    data: {
      userId,
      clientId: input.clientId,
      invoiceNumber,
      dueDate: new Date(input.dueDate),
      currency: input.currency ?? "USD",
      taxRate: input.taxRate ?? 0,
      taxAmount: totals.taxAmountCents,
      discountAmount: totals.discountAmountCents,
      subtotal: totals.subtotalCents,
      total: totals.totalCents,
      notes: input.notes,
      footer: input.footer,
      lineItems: {
        create: input.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: dollarsToCents(item.unitPrice),
          amount: dollarsToCents(item.quantity * item.unitPrice),
          sortOrder: item.sortOrder ?? 0,
        })),
      },
    },
    include: { client: true, lineItems: true },
  });

  return invoice as InvoiceWithClient;
}

export interface UpdateInvoicePayload extends UpdateInvoiceInput {
  // extends the existing interface — no additions needed
}

export async function updateInvoice(
  userId: string,
  invoiceId: string,
  input: UpdateInvoicePayload,
  currentInvoice: InvoiceWithClient
): Promise<InvoiceWithClient> {
  const { lineItems, dueDate, discountAmount, taxRate, ...rest } = input;

  const resolvedLineItems = lineItems
    ? lineItems
    : currentInvoice.lineItems.map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: li.unitPrice / 100, // convert cents back to dollars for computeTotals
        sortOrder: li.sortOrder,
      }));

  const effectiveTaxRate = taxRate ?? Number(currentInvoice.taxRate ?? 0);
  const effectiveDiscountDollars =
    discountAmount !== undefined
      ? discountAmount
      : currentInvoice.discountAmount / 100;

  const totals = computeTotals(resolvedLineItems, effectiveTaxRate, effectiveDiscountDollars);

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ...rest,
      subtotal: totals.subtotalCents,
      taxAmount: totals.taxAmountCents,
      discountAmount: totals.discountAmountCents,
      total: totals.totalCents,
      taxRate: effectiveTaxRate,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(lineItems
        ? {
            lineItems: {
              deleteMany: {},
              create: lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: dollarsToCents(item.unitPrice),
                amount: dollarsToCents(item.quantity * item.unitPrice),
                sortOrder: item.sortOrder ?? 0,
              })),
            },
          }
        : {}),
    },
    include: { client: true, lineItems: true },
  });

  return updated as InvoiceWithClient;
}

export async function deleteInvoice(
  userId: string,
  invoiceId: string
): Promise<"deleted" | "not_found" | "not_draft"> {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) return "not_found";
  if (invoice.status !== "DRAFT") return "not_draft";
  await prisma.invoice.delete({ where: { id: invoiceId } });
  return "deleted";
}

/**
 * Log an activity event against an invoice (outside a transaction).
 */
export async function logActivity(
  invoiceId: string,
  type: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.invoiceActivity.create({
    data: { invoiceId, type, metadata: metadata ?? null },
  });
}
