import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/invoices/[id]/pdf
 * Generates and streams a PDF for the given invoice.
 *
 * Note: PDF rendering with @react-pdf/renderer must run in a Node.js
 * environment. This route uses a dynamic import to avoid edge runtime issues.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, businessName: true, address: true, logoUrl: true },
  });

  // Dynamic import to keep this out of edge runtime
  const { renderToBuffer, InvoicePDF } = await import("@/lib/pdf/invoice-pdf");

  const pdfBuffer = await renderToBuffer(InvoicePDF({ invoice, user }));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.number}.pdf"`,
    },
  });
}
