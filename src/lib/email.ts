import { Resend } from "resend";
import type { Invoice, Client } from "@prisma/client";
import type { InvoiceWithClient } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "noreply@quickinvoice.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.quickinvoice.app";

// ─────────────────────────────────────────
// Email option interfaces
// ─────────────────────────────────────────

export interface SendInvoiceEmailOptions {
  invoice: InvoiceWithClient;
  paymentUrl?: string | null;
  senderName: string;
  senderEmail: string;
}

export interface SendReminderEmailOptions {
  invoice: Invoice & { client: Client };
  paymentUrl?: string | null;
  senderName: string;
  senderEmail: string;
}

export interface SendTrialEndingEmailOptions {
  to: string;
  name?: string | null;
  trialEndDate: Date;
}

export interface SendPasswordResetEmailOptions {
  to: string;
  resetUrl: string;
}

export interface SendEmailVerificationOptions {
  to: string;
  verificationUrl: string;
  name?: string;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** Format cents to a currency string (e.g. 250000 → "$2,500.00") */
function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// ─────────────────────────────────────────
// Send invoice to client
// ─────────────────────────────────────────

export async function sendInvoiceEmail(opts: SendInvoiceEmailOptions): Promise<void> {
  const { invoice, paymentUrl, senderName, senderEmail } = opts;

  const lineItemRows = invoice.lineItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border:1px solid #e5e7eb">${item.description}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${Number(item.quantity)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${formatCents(item.unitPrice, invoice.currency)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${formatCents(item.amount, invoice.currency)}</td>
        </tr>`
    )
    .join("\n");

  const paymentSection = paymentUrl
    ? `<p style="margin:24px 0"><a href="${paymentUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">View &amp; Pay Invoice</a></p>`
    : "";

  const taxRateNum = Number(invoice.taxRate ?? 0);

  const html = `
    <html>
      <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
        <h2 style="color:#6366f1">Invoice ${invoice.invoiceNumber} from ${senderName}</h2>
        <p>Hi ${invoice.client.name},</p>
        <p>Please find your invoice details below.</p>
        <p><strong>Due date:</strong> ${new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Description</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right">Qty</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right">Unit Price</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${lineItemRows}</tbody>
        </table>
        <p>Subtotal: ${formatCents(invoice.subtotal, invoice.currency)}</p>
        ${invoice.discountAmount > 0 ? `<p>Discount: -${formatCents(invoice.discountAmount, invoice.currency)}</p>` : ""}
        ${taxRateNum > 0 ? `<p>Tax (${taxRateNum}%): ${formatCents(invoice.taxAmount, invoice.currency)}</p>` : ""}
        <p style="font-size:18px"><strong>Total due: ${formatCents(invoice.total, invoice.currency)}</strong></p>
        ${paymentSection}
        <p style="color:#6b7280;font-size:12px;margin-top:32px">Sent by ${senderName} &lt;${senderEmail}&gt;</p>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: `"${senderName}" <${FROM_ADDRESS}>`,
    to: invoice.client.email,
    subject: `Invoice ${invoice.invoiceNumber} — ${formatCents(invoice.total, invoice.currency)} due ${new Date(invoice.dueDate).toLocaleDateString("en-US")}`,
    html,
  });
}

// ─────────────────────────────────────────
// Send payment reminder to client
// ─────────────────────────────────────────

export async function sendReminderEmail(opts: SendReminderEmailOptions): Promise<void> {
  const { invoice, paymentUrl, senderName, senderEmail } = opts;

  const viewPayUrl = paymentUrl ?? `${APP_URL}/invoice/${invoice.id}`;
  const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const isOverdue = new Date(invoice.dueDate) < new Date();

  const html = `
    <html>
      <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
        <h2 style="color:#f59e0b">Payment Reminder: Invoice ${invoice.invoiceNumber}</h2>
        <p>Hi ${invoice.client.name},</p>
        <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${formatCents(invoice.total, invoice.currency)}</strong> is ${isOverdue ? "<strong>overdue</strong>" : `due on <strong>${dueDateFormatted}</strong>`}.</p>
        ${isOverdue ? `<p style="color:#dc2626">This invoice was due on ${dueDateFormatted} and is now past due. Please arrange payment as soon as possible.</p>` : `<p>Please ensure payment is made by <strong>${dueDateFormatted}</strong> to avoid any late fees.</p>`}
        <p style="margin:24px 0">
          <a href="${viewPayUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">View &amp; Pay Invoice</a>
        </p>
        <p>If you have already made payment, please disregard this message. Thank you for your business!</p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px">Sent by ${senderName} &lt;${senderEmail}&gt;</p>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: `"${senderName}" <${FROM_ADDRESS}>`,
    to: invoice.client.email,
    subject: `Reminder: Invoice ${invoice.invoiceNumber} — ${formatCents(invoice.total, invoice.currency)}${isOverdue ? " is overdue" : ` due ${dueDateFormatted}`}`,
    html,
  });
}

// ─────────────────────────────────────────
// Trial ending soon notification
// ─────────────────────────────────────────

export async function sendTrialEndingEmail(opts: SendTrialEndingEmailOptions): Promise<void> {
  const { to, name, trialEndDate } = opts;

  const greeting = name ? `Hi ${name},` : "Hi there,";
  const trialEndFormatted = trialEndDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const upgradeUrl = `${APP_URL}/pricing`;

  const html = `
    <html>
      <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
        <h2 style="color:#6366f1">Your Quick Invoice trial is ending soon</h2>
        <p>${greeting}</p>
        <p>Your free trial ends on <strong>${trialEndFormatted}</strong>. After that, your account will revert to the Free plan, which has limited features.</p>
        <p>Upgrade now to keep access to all Pro features, including:</p>
        <ul>
          <li>Unlimited invoices &amp; clients</li>
          <li>Custom branding &amp; logo</li>
          <li>Automatic payment reminders</li>
          <li>Priority support</li>
        </ul>
        <p style="margin:24px 0">
          <a href="${upgradeUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">Upgrade Now</a>
        </p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px">You're receiving this because you have an active trial on Quick Invoice. Questions? Reply to this email.</p>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: `"Quick Invoice" <${FROM_ADDRESS}>`,
    to,
    subject: `Your Quick Invoice trial ends on ${trialEndFormatted} — upgrade to keep access`,
    html,
  });
}

// ─────────────────────────────────────────
// Password reset email
// ─────────────────────────────────────────

export async function sendPasswordResetEmail(opts: SendPasswordResetEmailOptions): Promise<void> {
  const { to, resetUrl } = opts;

  await resend.emails.send({
    from: `"Quick Invoice" <${FROM_ADDRESS}>`,
    to,
    subject: "Reset your Quick Invoice password",
    html: `
      <html>
        <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
          <h2 style="color:#6366f1">Password Reset</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <p style="margin:24px 0"><a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a></p>
          <p style="color:#6b7280;font-size:12px">If you didn&apos;t request this, you can safely ignore this email.</p>
        </body>
      </html>
    `,
  });
}

// ─────────────────────────────────────────
// Email verification
// ─────────────────────────────────────────

export async function sendEmailVerificationEmail(
  opts: SendEmailVerificationOptions
): Promise<void> {
  const { to, verificationUrl, name } = opts;

  const greeting = name ? `Hi ${name},` : "Hi there,";

  await resend.emails.send({
    from: `"Quick Invoice" <${FROM_ADDRESS}>`,
    to,
    subject: "Verify your Quick Invoice email address",
    html: `
      <html>
        <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
          <h2 style="color:#6366f1">Verify your email</h2>
          <p>${greeting}</p>
          <p>Thanks for signing up for Quick Invoice. Please verify your email address to get started.</p>
          <p style="margin:24px 0">
            <a href="${verificationUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">Verify Email</a>
          </p>
          <p style="color:#6b7280;font-size:12px">This link expires in 24 hours. If you didn&apos;t sign up, you can safely ignore this email.</p>
        </body>
      </html>
    `,
  });
}
