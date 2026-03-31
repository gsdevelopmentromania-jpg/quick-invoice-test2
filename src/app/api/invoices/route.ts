import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse, InvoiceWithClient } from "@/types";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
});

const createInvoiceSchema = z.object({
  clientId: z.string().cuid("Invalid client ID"),
  dueDate: z.string().datetime("Invalid due date"),
  currency: z.string().length(3).default("USD"),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

/**
 * GET /api/invoices
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
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const status = searchParams.get("status") ?? undefined;

  const where = {
    userId: session.user.id,
    ...(status ? { status: status as InvoiceWithClient["status"] } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true, lineItems: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    data: {
      data: invoices as InvoiceWithClient[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

/**
 * POST /api/invoices
 * Creates a new invoice (DRAFT) for the authenticated user.
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

  const { clientId, dueDate, currency, taxRate, notes, terms, lineItems } = parsed.data;

  // Verify the client belongs to the user
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Generate next invoice number
  const count = await prisma.invoice.count({ where: { userId: session.user.id } });
  const number = `INV-${String(count + 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      userId: session.user.id,
      clientId,
      number,
      dueDate: new Date(dueDate),
      currency,
      taxRate,
      notes,
      terms,
      lineItems: {
        create: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { client: true, lineItems: true },
  });

  return NextResponse.json({ data: invoice as InvoiceWithClient }, { status: 201 });
}
