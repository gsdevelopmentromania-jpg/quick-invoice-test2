import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";
import type { ApiResponse, InvoiceWithClient } from "@/types";

/**
 * POST /api/invoices/[id]/send
 * Marks invoice as SENT, creates a Stripe payment link, and emails the client.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<InvoiceWithClient>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { client: true, lineItems: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT invoices can be sent" }, { status: 409 });
  }

  if (invoice.lineItems.length === 0) {
    return NextResponse.json({ error: "Invoice must have at least one line item" }, { status: 400 });
  }

  // Calculate totals
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (invoice.taxRate / 100);
  const total = subtotal + tax;
  const amountInCents = Math.round(total * 100);

  // Create Stripe payment link
  let stripePaymentLinkUrl: string | null = null;
  let stripePaymentLinkId: string | null = null;

  try {
    const price = await stripe.prices.create({
      currency: invoice.currency.toLowerCase(),
      unit_amount: amountInCents,
      product_data: {
        name: `Invoice ${invoice.number}`,
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
    console.error("Stripe payment link creation failed:", err);
    // Non-fatal — invoice can still be sent without payment link
  }

  // Update invoice to SENT
  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      stripePaymentLinkId,
      stripePaymentLinkUrl,
    },
    include: { client: true, lineItems: true },
  });

  // TODO: Send email via Resend / Nodemailer (see src/lib/email.ts)

  return NextResponse.json({ data: updated as InvoiceWithClient });
}
