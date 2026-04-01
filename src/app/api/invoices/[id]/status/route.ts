import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, InvoiceWithClient } from "@/types";
import { InvoiceStatus } from "@prisma/client";

const updateStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
});

/**
 * PATCH /api/v1/invoices/[id]/status
 * Manually update invoice status (e.g., mark as PAID or CANCELLED).
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

  const body: unknown = await req.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { status } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === "PAID" ? { paidAt: new Date() } : {}),
      },
      include: { client: true, lineItems: true },
    });

    await tx.invoiceActivity.create({
      data: {
        invoiceId: inv.id,
        type: `STATUS_CHANGED`,
        metadata: { from: invoice.status, to: status },
      },
    });

    return inv;
  });

  return NextResponse.json({ data: updated as InvoiceWithClient });
}
