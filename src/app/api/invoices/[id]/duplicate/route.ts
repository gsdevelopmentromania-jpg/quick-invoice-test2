import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, InvoiceWithClient } from "@/types";

/**
 * POST /api/v1/invoices/[id]/duplicate
 * Clones an existing invoice as a new DRAFT with a new invoice number.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<InvoiceWithClient>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { lineItems: true },
  });

  if (!source) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const count = await prisma.invoice.count({ where: { userId: session.user.id } });
  const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const duplicate = await prisma.invoice.create({
    data: {
      userId: session.user.id,
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

  await prisma.invoiceActivity.create({
    data: {
      invoiceId: duplicate.id,
      type: "CREATED",
      metadata: { duplicatedFrom: source.id },
    },
  });

  return NextResponse.json({ data: duplicate as InvoiceWithClient }, { status: 201 });
}
