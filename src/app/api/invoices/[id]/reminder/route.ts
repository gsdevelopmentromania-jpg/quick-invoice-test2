import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

/**
 * POST /api/v1/invoices/[id]/reminder
 * Sends a payment reminder email to the client.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot send reminder for a paid or cancelled invoice" },
      { status: 409 }
    );
  }

  if (invoice.status === "DRAFT") {
    return NextResponse.json(
      { error: "Send the invoice before sending a reminder" },
      { status: 409 }
    );
  }

  // TODO: Send reminder email via Resend (src/lib/email.ts)
  // await sendReminderEmail({ invoice, client: invoice.client });

  await prisma.invoiceActivity.create({
    data: {
      invoiceId: invoice.id,
      type: "REMINDER_SENT",
      metadata: { sentTo: invoice.client.email },
    },
  });

  return NextResponse.json({ data: { success: true } });
}
