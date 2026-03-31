import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, InvoiceWithClient } from "@/types";

const updateInvoiceSchema = z.object({
  clientId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
      })
    )
    .min(1)
    .optional(),
});

/**
 * GET /api/invoices/[id]
 * Returns a single invoice with line items and client info.
 */
export async function GET(
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

  // Mark as viewed if it was sent
  if (invoice.status === "SENT" && !invoice.viewedAt) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
  }

  return NextResponse.json({ data: invoice as InvoiceWithClient });
}

/**
 * PATCH /api/invoices/[id]
 * Updates an existing invoice. Only DRAFT invoices can be fully edited.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<InvoiceWithClient>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot edit a paid or cancelled invoice" },
      { status: 409 }
    );
  }

  const body: unknown = await req.json();
  const parsed = updateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { lineItems, dueDate, ...rest } = parsed.data;

  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(lineItems
        ? {
            lineItems: {
              deleteMany: {},
              create: lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
              })),
            },
          }
        : {}),
    },
    include: { client: true, lineItems: true },
  });

  return NextResponse.json({ data: updated as InvoiceWithClient });
}

/**
 * DELETE /api/invoices/[id]
 * Soft-cancels or hard-deletes a DRAFT invoice.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "DRAFT") {
    await prisma.invoice.delete({ where: { id: params.id } });
  } else {
    // Soft-cancel non-draft invoices
    await prisma.invoice.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });
  }

  return NextResponse.json({ data: { deleted: true } });
}
