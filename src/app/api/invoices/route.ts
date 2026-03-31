import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { dollarsToCents } from "@/types";
import type { ApiResponse, PaginatedResponse, InvoiceWithClient } from "@/types";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  sortOrder: z.number().int().default(0),
});

const createInvoiceSchema = z.object({
  clientId: z.string().cuid("Invalid client ID"),
  dueDate: z.string().datetime("Invalid due date"),
  currency: z.string().length(3).default("USD"),
  taxRate: z.number().min(0).max(100).default(0),
  discountAmount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  footer: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

/**
 * GET /api/v1/invoices
 * Returns paginated list of invoices for the authenticated user.
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<PaginatedResponse<InvoiceWithClient>>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const status = searchParams.get("status") ?? undefined;
  const clientId = searchParams.get("clientId") ?? undefined;

  const where = {
    userId: session.user.id,
    ...(status ? { status: status as InvoiceWithClient["status"] } : {}),
    ...(clientId ? { clientId } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true, lineItems: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    data: {
      data: invoices as InvoiceWithClient[],
      total,
      page,
      limit,
    },
  });
}

/**
 * POST /api/v1/invoices
 * Creates a new invoice (DRAFT) for the authenticated user.
 * All monetary values accepted in dollars; stored in cents.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<InvoiceWithClient>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { clientId, dueDate, currency, taxRate, discountAmount, notes, footer, lineItems } =
    parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Generate next invoice number
  const count = await prisma.invoice.count({ where: { userId: session.user.id } });
  const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

  // Calculate totals (all in cents)
  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + dollarsToCents(item.quantity * item.unitPrice),
    0
  );
  const discountCents = dollarsToCents(discountAmount);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * (taxRate / 100));
  const totalCents = taxableCents + taxCents;

  const invoice = await prisma.invoice.create({
    data: {
      userId: session.user.id,
      clientId,
      invoiceNumber,
      dueDate: new Date(dueDate),
      currency,
      taxRate,
      taxAmount: taxCents,
      discountAmount: discountCents,
      subtotal: subtotalCents,
      total: totalCents,
      notes,
      footer,
      lineItems: {
        create: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: dollarsToCents(item.unitPrice),
          amount: dollarsToCents(item.quantity * item.unitPrice),
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: { client: true, lineItems: true },
  });

  return NextResponse.json({ data: invoice as InvoiceWithClient }, { status: 201 });
}
