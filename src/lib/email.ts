import nodemailer from "nodemailer";
import type { InvoiceWithClient } from "@/types";

// ─────────────────────────────────────────
// Transport factory
// Supports SMTP (Nodemailer) out of the box.
// Swap for Resend by replacing sendMail below with the Resend SDK.
// ─────────────────────────────────────────

function createTransport(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

// ─────────────────────────────────────────
// Email payloads
// ─────────────────────────────────────────

export interface SendInvoiceEmailOptions {
  invoice: InvoiceWithClient;
  paymentUrl?: string | null;
  senderName: string;
  senderEmail: string;
}

export interface SendPasswordResetEmailOptions {
  to: string;
  resetUrl: string;
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
          <td>${item.description}</td>
          <td>${Number(item.quantity)}</td>
          <td>${formatCents(item.unitPrice, invoice.currency)}</td>
          <td>${formatCents(item.amount, invoice.currency)}</td>
        </tr>`
    )
    .join("\n");

  const paymentSection = paymentUrl
    ? `<p><a href="${paymentUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Pay Now</a></p>`
    : "";

  const taxRateNum = Number(invoice.taxRate ?? 0);

  const html = `
    <html>
      <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2>Invoice ${invoice.invoiceNumber} from ${senderName}</h2>
        <p>Due: ${new Date(invoice.dueDate).toLocaleDateString("en-US")}</p>
        <table border="1" cellpadding="8" cellspacing="0" width="100%" style="border-collapse:collapse">
          <thead>
            <tr style="background:#f3f4f6">
              <th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>${lineItemRows}</tbody>
        </table>
        <p>Subtotal: ${formatCents(invoice.subtotal, invoice.currency)}</p>
        ${invoice.discountAmount > 0 ? `<p>Discount: -${formatCents(invoice.discountAmount, invoice.currency)}</p>` : ""}
        ${taxRateNum > 0 ? `<p>Tax (${taxRateNum}%): ${formatCents(invoice.taxAmount, invoice.currency)}</p>` : ""}
        <p><strong>Total: ${formatCents(invoice.total, invoice.currency)}</strong></p>
        ${paymentSection}
        <p style="color:#6b7280;font-size:12px">Sent by ${senderName} &lt;${senderEmail}&gt;</p>
      </body>
    </html>
  `;

  const transporter = createTransport();

  await transporter.sendMail({
    from: `"${senderName}" <${process.env.EMAIL_FROM ?? senderEmail}>`,
    to: invoice.client.email,
    subject: `Invoice ${invoice.invoiceNumber} — ${formatCents(invoice.total, invoice.currency)} due ${new Date(invoice.dueDate).toLocaleDateString("en-US")}`,
    html,
  });
}

// ─────────────────────────────────────────
// Password reset email
// ─────────────────────────────────────────

export async function sendPasswordResetEmail(opts: SendPasswordResetEmailOptions): Promise<void> {
  const { to, resetUrl } = opts;

  const transporter = createTransport();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@quickinvoice.app",
    to,
    subject: "Reset your Quick Invoice password",
    html: `
      <html>
        <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2>Password Reset</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Reset Password</a></p>
          <p style="color:#6b7280;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
        </body>
      </html>
    `,
  });
}
