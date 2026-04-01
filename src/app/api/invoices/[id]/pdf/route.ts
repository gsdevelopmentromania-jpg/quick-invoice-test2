import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canDownloadPDF } from "@/lib/billing";

/**
 * GET /api/v1/invoices/[id]/pdf
 * Generates and streams a PDF for the given invoice.
 * Requires Pro or higher plan (feature gate: pdfDownloads).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [invoice, user] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { client: true, lineItems: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        fullName: true,
        email: true,
        businessName: true,
        businessAddress: true,
        logoUrl: true,
      },
    }),
  ]);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Feature gate: PDF downloads require Pro or higher ──────────────────
  if (!canDownloadPDF(user.plan)) {
    return NextResponse.json(
      { error: "PDF downloads require a Pro plan. Upgrade to unlock this feature." },
      { status: 403 }
    );
  }

  // Dynamic import to avoid edge runtime — PDF rendering needs Node.js
  const { renderToBuffer, InvoicePDF } = await import("@/lib/pdf/invoice-pdf");

  const pdfBuffer = await renderToBuffer(InvoicePDF({ invoice, user }));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
