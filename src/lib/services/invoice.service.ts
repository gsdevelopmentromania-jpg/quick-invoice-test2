/**
 * Invoice Service
 *
 * Orchestrates invoice business logic by combining:
 *  - DAL operations (data access)
 *  - Plan/billing feature gates
 *  - Stripe payment link creation
 *  - Email delivery
 *
 * Route handlers should call these service functions instead of
 * touching the DAL or external APIs directly.
 */

import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { canCreateInvoice, canDownloadPDF, canSendReminders } from "@/lib/billing";
import { sendInvoiceEmail, sendReminderEmail } from "@/lib/email";
import { ApiError } from "@/lib/errors";
import {
  createInvoice as dalCreateInvoice,
  getInvoice,
  listInvoices,
  updateInvoice as dalUpdateInvoice,
  deleteInvoice as dalDeleteInvoice,
  generateInvoiceNumber,
  logActivity,
  type ListInvoicesOptions,
  type PaginatedInvoices,
  type UpdateInvoicePayload,
} from "@/lib/dal/invoices";
import type {
  InvoiceWithClient,
  CreateInvoiceInput,
  InvoiceTotals,
} from "@/types";
import { Plan } from "@prisma/client";

// ─── Re-exports for consumers that only import from services ─────────────────

export type { ListInvoicesOptions, PaginatedInvoices, UpdateInvoicePayload };

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of invoices for a user.
 */
export async function listUserInvoices(
  userId: string,
  options: ListInvoicesOptions = {}
): Promise<PaginatedInvoices> {
  return listInvoices(userId, options);
}

/**
 * Fetch a single invoice by ID.
 * Throws 404 if not found or not owned by userId.
 * Auto-transitions SENT → VIEWED and logs the activity.
 */
export async function getUserInvoice(
  userId: string,
  invoiceId: string
): Promise<InvoiceWithClient> {
  const invoice = await getInvoice(userId, invoiceId);
  if (!invoice) {
    throw new ApiError("Invoice not found", 404);
  }

  // Auto-transition SENT → VIEWED
  if (invoice.status === "SENT" && !invoice.viewedAt) {
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "VIEWED", viewedAt: new Date() },
      }),
      prisma.invoiceActivity.create({
        data: { invoiceId, type: "VIEWED" },
      }),
    ]);
    // Return the mutated shape without a second fetch
    return { ...invoice, status: "VIEWED" as const, viewedAt: new Date() };
  }

  return invoice;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateInvoiceServiceInput extends CreateInvoiceInput {
  /** Caller's plan, used to enforce feature gates */
  plan: Plan;
}

/**
 * Create a new DRAFT invoice.
 * Enforces plan-based monthly invoice limits.
 * Throws 403 if the user has reached their limit.
 * Throws 404 if the clientId does not belong to userId.
 */
export async function createUserInvoice(
  userId: string,
  input: CreateInvoiceServiceInput
): Promise<InvoiceWithClient> {
  const { plan, ...invoiceInput } = input;

  const allowed = await canCreateInvoice(userId, plan);
  if (!allowed) {
    throw new ApiError(
      "You have reached your monthly invoice limit. Upgrade to Pro for unlimited invoices.",
      403
    );
  }

  const client = await prisma.client.findFirst({
    where: { id: invoiceInput.clientId, userId },
  });
  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  return dalCreateInvoice(userId, invoiceInput);
}

/**
 * Update an existing invoice.
 * Throws 404 if not found.
 * Throws 409 if invoice is PAID or CANCELLED.
 */
export async function updateUserInvoice(
  userId: string,
  invoiceId: string,
  input: UpdateInvoicePayload
): Promise<InvoiceWithClient> {
  const invoice = await getInvoice(userId, invoiceId);
  if (!invoice) {
    throw new ApiError("Invoice not found", 404);
  }
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    throw new ApiError("Cannot edit a paid or cancelled invoice", 409);
  }
  return dalUpdateInvoice(userId, invoiceId, input, invoice);
}

/**
 * Delete a DRAFT invoice.
 * Throws 404 if not found, 409 if not a DRAFT.
 */
export async function deleteUserInvoice(
  userId: string,
  invoiceId: string
): Promise<void> {
  const result = await dalDeleteInvoice(userId, invoiceId);
  if (result === "not_found") {
    throw new ApiError("Invoice not found", 404);
  }
  if (result === "not_draft") {
    throw new ApiError("Only DRAFT invoices can be deleted", 409);
  }
}

/**
 * Manually set the status of an invoice.
 * Records a STATUS_CHANGED activity log entry.
 * Sets paidAt when transitioning to PAID.
 * Throws 404 if not found.
 */
export async function setInvoiceStatus(
  userId: string,
  invoiceId: string,
  status: string
): Promise<InvoiceWithClient> {
  const invoice = await getInvoice(userId, invoiceId);
  if (!invoice) {
    throw new ApiError("Invoice not found", 404);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: status as InvoiceWithClient["status"],
        ...(status === "PAID" ? { paidAt: new Date() } : {}),
      },
      include: { client: true, lineItems: true },
    });

    await tx.invoiceActivity.create({
      data: {
        invoiceId,
        type: "STATUS_CHANGED",
        metadata: { from: invoice.status, to: status },
      },
    });

    return inv;
  });

  return updated as InvoiceWithClient;
}

// ─── Send / Remind ────────────────────────────────────────────────────────────

export interface SendInvoiceOptions {
  senderName: string;
  senderEmail: string;
}

/**
 * Mark an invoice as SENT, create a Stripe payment link, and email the client.
 * Stripe failure is non-fatal (logged, payment link omitted).
 * Email failure is non-fatal (logged, response still succeeds).
 * Throws 404 if not found, 409 if not a DRAFT, 400 if no line items.
 */
export async function sendUserInvoice(
  userId: string,
  invoiceId: string,
  opts: SendInvoiceOptions
): Promise<InvoiceWithClient & { paymentUrl: string | null }> {
  const invoice = await getInvoice(userId, invoiceId);
  if (!invoice) {
    throw new ApiError("Invoice not found", 404);
  }
  if (invoice.status !== "DRAFT") {
    throw new ApiError("Only DRAFT invoices can be sent", 409);
  }
  if (invoice.lineItems.length === 0) {
    throw new ApiError("Invoice must have at least one line item", 400);
  }

  let stripePaymentLinkUrl: string | null = null;
  let stripePaymentLinkId: string | null = null;

  try {
    const price = await stripe.prices.create({
      currency: invoice.currency.toLowerCase(),
      unit_amount: invoice.total,
      product_data: {
        name: `Invoice ${invoice.invoiceNumber}`,
        metadata: { invoiceId: invoice.id },
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { invoiceId: invoice.id },
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${invoice.id}/thank-you`,
        },
      },
    });

    stripePaymentLinkUrl = paymentLink.url;
    stripePaymentLinkId = paymentLink.id;
  } catch (err) {
    console.error("[invoice.service] Stripe payment link creation failed:", err);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "SENT", sentAt: new Date(), stripePaymentLinkId },
      include: { client: true, lineItems: true },
    });

    await tx.invoiceActivity.create({
      data: { invoiceId, type: "SENT", metadata: { paymentUrl: stripePaymentLinkUrl } },
    });

    return inv;
  });

  try {
    await sendInvoiceEmail({
      invoice: updated as InvoiceWithClient,
      paymentUrl: stripePaymentLinkUrl,
      senderName: opts.senderName,
      senderEmail: opts.senderEmail,
    });
  } catch (emailErr) {
    console.error("[invoice.service] Failed to send invoice email:", emailErr);
  }

  return { ...(updated as InvoiceWithClient), paymentUrl: stripePaymentLinkUrl };
}

export interface SendReminderOptions {
  senderName: string;
  senderEmail: string;
  plan: Plan;
}

/**
 * Send a payment reminder for an existing SENT or VIEWED invoice.
 * Enforces the canSendReminders feature gate.
 * Throws 403 if not on a plan that allows reminders.
 * Throws 404/409 for invalid state.
 */
export async function sendInvoiceReminder(
  userId: string,
  invoiceId: string,
  opts: SendReminderOptions
): Promise<void> {
  if (!canSendReminders(opts.plan)) {
    throw new ApiError(
      "Payment reminders are not available on your current plan. Upgrade to Pro.",
      403
    );
  }

  const invoice = await getInvoice(userId, invoiceId);
  if (!invoice) {
    throw new ApiError("Invoice not found", 404);
  }
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    throw new ApiError("Cannot send reminder for a paid or cancelled invoice", 409);
  }
  if (invoice.status === "DRAFT") {
    throw new ApiError("Send the invoice before sending a reminder", 409);
  }

  await logActivity(invoiceId, "REMINDER_SENT", { sentTo: invoice.client.email });

  try {
    await sendReminderEmail({
      invoice,
      senderName: opts.senderName,
      senderEmail: opts.senderEmail,
    });
  } catch (emailErr) {
    console.error("[invoice.service] Failed to send reminder email:", emailErr);
  }
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

/**
 * Duplicate an existing invoice as a new DRAFT with a new invoice number
 * and a due date 30 days from today.
 * Throws 404 if the source invoice is not found.
 */
export async function duplicateInvoice(
  userId: string,
  sourceId: string
): Promise<InvoiceWithClient> {
  const source = await prisma.invoice.findFirst({
    where: { id: sourceId, userId },
    include: { lineItems: true },
  });
  if (!source) {
    throw new ApiError("Invoice not found", 404);
  }

  const invoiceNumber = await generateInvoiceNumber(userId);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const duplicate = await prisma.invoice.create({
    data: {
      userId,
      clientId: source.clientId,
      invoiceNumber,
      status: "DRAFT",
      currency: source.currency,
      dueDate,
      notes: source.notes,
      footer: source.footer,
      subtotal: source.subtotal,
      taxRate: source.taxRate,
      taxAmount: source.taxAmount,
      discountAmount: source.discountAmount,
      total: source.total,
      lineItems: {
        create: source.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: { client: true, lineItems: true },
  });

  await logActivity(duplicate.id, "CREATED", { duplicatedFrom: source.id });

  return duplicate as InvoiceWithClient;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/**
 * Verify that the caller's plan allows PDF downloads, and that they own the invoice.
 * Returns the full invoice (with client + line items) for the PDF renderer.
 * Throws 403 if plan does not include PDF downloads.
 * Throws 404 if not found.
 */
export async function getInvoiceForPdf(
  userId: string,
  invoiceId: string,
  plan: Plan
): Promise<InvoiceWithClient> {
  if (!canDownloadPDF(plan)) {
    throw new ApiError(
      "PDF downloads are not available on your current plan. Upgrade to Pro.",
      403
    );
  }

  const invoice = await getInvoice(userId, invoiceId);
  if (!invoice) {
    throw new ApiError("Invoice not found", 404);
  }

  return invoice;
}

// ─── Totals helper (re-exported for convenience) ─────────────────────────────

export { computeTotals } from "@/lib/dal/invoices";
export type { InvoiceTotals };
