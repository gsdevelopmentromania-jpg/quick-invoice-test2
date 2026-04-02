import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export type PublicInvoiceData = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  subtotal: number;
  taxRate: string | null;
  taxAmount: number;
  discountAmount: number;
  total: number;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: number;
    amount: number;
    sortOrder: number;
  }>;
  clientName: string;
  businessName: string | null;
  paymentUrl: string | null;
};

/**
 * GET /api/invoice/[id]
 * Public endpoint — no authentication required.
 * Returns only non-sensitive invoice fields safe for client display.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<PublicInvoiceData>>> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { name: true } },
        user: { select: { businessName: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
        activities: {
          where: { type: "SENT" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Payment URL is stored in InvoiceActivity metadata when the invoice is sent
    const sentActivity = invoice.activities[0];
    const paymentUrl: string | null =
      sentActivity && sentActivity.metadata
        ? ((sentActivity.metadata as { paymentUrl?: string }).paymentUrl ?? null)
        : null;

    const data: PublicInvoiceData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      notes: invoice.notes,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate ? invoice.taxRate.toString() : null,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      total: invoice.total,
      lineItems: invoice.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice,
        amount: item.amount,
        sortOrder: item.sortOrder,
      })),
      clientName: invoice.client.name,
      businessName: invoice.user.businessName,
      paymentUrl,
    };

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[public-invoice] fetch failed:", err);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}
