import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { dollarsToCents } from "@/types";
import type { ApiResponse, InvoiceWithClient } from "@/types";

const updateInvoiceSchema = z.object({
  clientId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  footer: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        sortOrder: z.number().int().default(0),
      })
    )
    .min(1)
    .optional(),
});

/**
 * GET /api/v1/invoices/[id]
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

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { client: true, lineItems: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Mark as viewed if sent (and log activity)
    if (invoice.status === "SENT" && !invoice.viewedAt) {
      await prisma.$transaction([
        prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "VIEWED", viewedAt: new Date() },
        }),
        prisma.invoiceActivity.create({
          data: { invoiceId: invoice.id, type: "VIEWED" },
        }),
      ]);
    }

    return NextResponse.json({ data: invoice as InvoiceWithClient });
  } catch (err) {
    console.error("GET /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/invoices/[id]
 * Updates an existing invoice. PAID and CANCELLED invoices cannot be edited.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<InvoiceWithClient>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { lineItems: true },
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

    const { lineItems, dueDate, discountAmount, taxRate, ...rest } = parsed.data;

    const effectiveTaxRate = taxRate ?? Number(invoice.taxRate ?? 0);
    const effectiveDiscountCents =
      discountAmount !== undefined
        ? dollarsToCents(discountAmount)
        : invoice.discountAmount;

    // When no new line items provided, use existing ones.
    // Existing unitPrice is stored in cents — divide by 100 for the calculation.
    const lineItemsForCalc = lineItems
      ? lineItems.map((item) => ({ quantity: item.quantity, unitPriceDollars: item.unitPrice }))
      : invoice.lineItems.map((li) => ({
          quantity: Number(li.quantity),
          unitPriceDollars: li.unitPrice / 100, // cents → dollars
        }));

    const subtotalCents = lineItemsForCalc.reduce(
      (sum, item) => sum + dollarsToCents(item.quantity * item.unitPriceDollars),
      0
    );
    const taxableCents = subtotalCents - effectiveDiscountCents;
    const taxCents = Math.round(taxableCents * (effectiveTaxRate / 100));

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...rest,
        subtotal: subtotalCents,
        taxAmount: taxCents,
        discountAmount: effectiveDiscountCents,
        total: taxableCents + taxCents,
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
                  sortOrder: item.sortOrder,
                })),
              },
            }
          : {}),
      },
      include: { client: true, lineItems: true },
    });

    return NextResponse.json({ data: updated as InvoiceWithClient });
  } catch (err) {
    console.error("PATCH /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/invoices/[id]
 * Hard-deletes DRAFT invoices only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT invoices can be deleted" },
        { status: 409 }
      );
    }

    await prisma.invoice.delete({ where: { id: params.id } });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("DELETE /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
