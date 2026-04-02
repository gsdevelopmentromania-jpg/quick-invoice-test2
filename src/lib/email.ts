import { Resend } from "resend";
import type { Invoice, Client, LineItem } from "@prisma/client";

// ─────────────────────────────────────────
// Resend client (lazy-initialised so the module doesn't throw at import
// time when RESEND_API_KEY is not set in preview/test environments)
// ─────────────────────────────────────────

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Quick Invoice <noreply@quickinvoice.app>";

// ─────────────────────────────────────────
// Email payload interfaces
// ─────────────────────────────────────────

export interface SendInvoiceEmailOptions {
  invoice: Invoice & { client: Client; lineItems: LineItem[] };
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
  name?: string;
  trialEndDate: Date;
  upgradeUrl: string;
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

function baseLayout(content: string): string {
  return `
    <html>
      <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">
        ${content}
      </body>
    </html>
  `;
}

function ctaButton(href: string, label: string, color = "#6366f1"): string {
  return `<p><a href="${href}" style="display:inline-block;background:${color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">${label}</a></p>`;
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
          <td style="padding:8px;border:1px solid #e5e7eb;">${item.description}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${Number(item.quantity)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${formatCents(item.unitPrice, invoice.currency)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${formatCents(item.amount, invoice.currency)}</td>
        </tr>`
    )
    .join("\n");

  const taxRateNum = Number(invoice.taxRate ?? 0);

  const html = baseLayout(`
    <h2 style="margin-top:0;">Invoice ${invoice.invoiceNumber} from ${senderName}</h2>
    <p>Hi ${invoice.client.name},</p>
    <p>Please find your invoice details below. Payment is due by <strong>${new Date(invoice.dueDate).toLocaleDateString("en-US")}</strong>.</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Description</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Qty</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Unit Price</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${lineItemRows}</tbody>
    </table>
    <p>Subtotal: ${formatCents(invoice.subtotal, invoice.currency)}</p>
    ${invoice.discountAmount > 0 ? `<p>Discount: -${formatCents(invoice.discountAmount, invoice.currency)}</p>` : ""}
    ${taxRateNum > 0 ? `<p>Tax (${taxRateNum}%): ${formatCents(invoice.taxAmount, invoice.currency)}</p>` : ""}
    <p><strong>Total Due: ${formatCents(invoice.total, invoice.currency)}</strong></p>
    ${paymentUrl ? ctaButton(paymentUrl, "View & Pay Invoice") : ""}
    <p style="color:#6b7280;font-size:12px;margin-top:32px;">Sent by ${senderName} &lt;${senderEmail}&gt;</p>
  `);

  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: invoice.client.email,
    subject: `Invoice ${invoice.invoiceNumber} — ${formatCents(invoice.total, invoice.currency)} due ${new Date(invoice.dueDate).toLocaleDateString("en-US")}`,
    html,
  });
}

// ─────────────────────────────────────────
// Reminder email
// ─────────────────────────────────────────

export async function sendReminderEmail(opts: SendReminderEmailOptions): Promise<void> {
  const { invoice, paymentUrl, senderName, senderEmail } = opts;

  const dueDateStr = new Date(invoice.dueDate).toLocaleDateString("en-US");
  const isOverdue = new Date(invoice.dueDate) < new Date();

  const html = baseLayout(`
    <h2 style="margin-top:0;">${isOverdue ? "⚠️ Overdue" : "Friendly Reminder"}: Invoice ${invoice.invoiceNumber}</h2>
    <p>Hi ${invoice.client.name},</p>
    <p>This is a${isOverdue ? "n overdue notice" : " friendly reminder"} that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${formatCents(invoice.total, invoice.currency)}</strong> ${isOverdue ? "was" : "is"} due on <strong>${dueDateStr}</strong>.</p>
    <p>If you have already made your payment, please disregard this email.</p>
    ${paymentUrl ? ctaButton(paymentUrl, "View & Pay Invoice") : ""}
    <p style="color:#6b7280;font-size:12px;margin-top:32px;">Sent by ${senderName} &lt;${senderEmail}&gt;</p>
  `);

  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: invoice.client.email,
    subject: isOverdue
      ? `OVERDUE: Invoice ${invoice.invoiceNumber} — ${formatCents(invoice.total, invoice.currency)}`
      : `Reminder: Invoice ${invoice.invoiceNumber} — ${formatCents(invoice.total, invoice.currency)} due ${dueDateStr}`,
    html,
  });
}

// ─────────────────────────────────────────
// Trial ending soon email
// ─────────────────────────────────────────

export async function sendTrialEndingEmail(opts: SendTrialEndingEmailOptions): Promise<void> {
  const { to, name, trialEndDate, upgradeUrl } = opts;

  const greeting = name ? `Hi ${name},` : "Hi there,";
  const endDateStr = trialEndDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = baseLayout(`
    <h2 style="margin-top:0;">Your trial ends soon</h2>
    <p>${greeting}</p>
    <p>Your Quick Invoice free trial ends on <strong>${endDateStr}</strong>. After that, you'll need a paid plan to continue creating invoices and managing clients.</p>
    <p>Upgrade now to keep access to all features without interruption.</p>
    ${ctaButton(upgradeUrl, "Upgrade My Plan")}
    <p style="color:#6b7280;font-size:12px;margin-top:32px;">You're receiving this because you signed up for a Quick Invoice trial.</p>
  `);

  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your Quick Invoice trial ends on ${endDateStr}`,
    html,
  });
}

// ─────────────────────────────────────────
// Password reset email
// ─────────────────────────────────────────

export async function sendPasswordResetEmail(opts: SendPasswordResetEmailOptions): Promise<void> {
  const { to, resetUrl } = opts;

  const html = baseLayout(`
    <h2 style="margin-top:0;">Password Reset</h2>
    <p>Click the button below to reset your password. This link expires in 1 hour.</p>
    ${ctaButton(resetUrl, "Reset Password")}
    <p style="color:#6b7280;font-size:12px;">If you didn&apos;t request this, you can safely ignore this email.</p>
  `);

  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your Quick Invoice password",
    html,
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

  const html = baseLayout(`
    <h2 style="margin-top:0;">Verify your email</h2>
    <p>${greeting}</p>
    <p>Thanks for signing up for Quick Invoice. Please verify your email address to get started.</p>
    ${ctaButton(verificationUrl, "Verify Email")}
    <p style="color:#6b7280;font-size:12px;">This link expires in 24 hours. If you didn&apos;t sign up, you can safely ignore this email.</p>
  `);

  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Verify your Quick Invoice email address",
    html,
  });
}
