/**
 * Integration tests for /api/invoices and /api/invoices/[id]
 *
 * Prisma, NextAuth, and Stripe are mocked — no real services needed.
 */

import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMock } from "../helpers/mock-prisma";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

const prismaMock = getPrismaMock();
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prismaMock }));

// Stub Stripe — it's only needed for the /send route which we test separately
jest.mock("@/lib/stripe", () => ({
  __esModule: true,
  default: {
    prices: { create: jest.fn().mockResolvedValue({ id: "price_test" }) },
    paymentLinks: {
      create: jest.fn().mockResolvedValue({ id: "plink_test", url: "https://pay.stripe.com/test" }),
    },
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { GET as getInvoices, POST as postInvoice } from "@/app/api/invoices/route";
import {
  GET as getInvoice,
  PATCH as patchInvoice,
  DELETE as deleteInvoice,
} from "@/app/api/invoices/[id]/route";
import { PATCH as patchStatus } from "@/app/api/invoices/[id]/status/route";
import { POST as duplicateInvoice } from "@/app/api/invoices/[id]/duplicate/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-abc", email: "test@example.com" } };

const CLIENT = {
  id: "client-001",
  userId: "user-abc",
  name: "Acme Corp",
  email: "billing@acme.com",
  company: null,
  address: null,
  phone: null,
  currency: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const LINE_ITEM = {
  id: "li-001",
  invoiceId: "inv-001",
  description: "Consulting",
  quantity: { toString: () => "1.00", toNumber: () => 1 },
  unitPrice: 10000,
  amount: 10000,
  sortOrder: 0,
};

const INVOICE = {
  id: "inv-001",
  userId: "user-abc",
  clientId: "client-001",
  invoiceNumber: "INV-0001",
  status: "DRAFT" as const,
  currency: "USD",
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 86400000),
  notes: null,
  footer: null,
  subtotal: 10000,
  taxRate: null,
  taxAmount: 0,
  discountAmount: 0,
  total: 10000,
  pdfUrl: null,
  stripePaymentLinkId: null,
  stripePaymentIntentId: null,
  paidAt: null,
  sentAt: null,
  viewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  client: CLIENT,
  lineItems: [LINE_ITEM],
};

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown; searchParams?: Record<string, string> } = {}
) {
  const fullUrl = new URL(url, "http://localhost:3000");
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) =>
      fullUrl.searchParams.set(k, v)
    );
  }
  return new NextRequest(fullUrl.toString(), {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetPrismaMock();
  mockGetServerSession.mockReset();
});

// ── GET /api/invoices ─────────────────────────────────────────────────────────

describe("GET /api/invoices", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await getInvoices(makeRequest("/api/invoices"));
    expect(res.status).toBe(401);
  });

  it("returns paginated invoice list", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findMany.mockResolvedValue([INVOICE]);
    prismaMock.invoice.count.mockResolvedValue(1);

    const res = await getInvoices(makeRequest("/api/invoices"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.data).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it("filters by status query param", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await getInvoices(makeRequest("/api/invoices", { searchParams: { status: "SENT" } }));

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "SENT" }),
      })
    );
  });

  it("filters by clientId query param", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await getInvoices(
      makeRequest("/api/invoices", { searchParams: { clientId: "client-001" } })
    );

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: "client-001" }),
      })
    );
  });

  it("applies page and limit params", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await getInvoices(
      makeRequest("/api/invoices", { searchParams: { page: "3", limit: "5" } })
    );

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
  });
});

// ── POST /api/invoices ────────────────────────────────────────────────────────

describe("POST /api/invoices", () => {
  const validBody = {
    clientId: "client-001cuid00000000000000",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    currency: "USD",
    taxRate: 0,
    discountAmount: 0,
    lineItems: [{ description: "Dev work", quantity: 1, unitPrice: 100 }],
  };

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postInvoice(makeRequest("/api/invoices", { method: "POST", body: validBody }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when lineItems is empty", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await postInvoice(
      makeRequest("/api/invoices", {
        method: "POST",
        body: { ...validBody, lineItems: [] },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when dueDate is invalid", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await postInvoice(
      makeRequest("/api/invoices", {
        method: "POST",
        body: { ...validBody, dueDate: "not-a-date" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when client not found or not owned", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(null);

    const res = await postInvoice(makeRequest("/api/invoices", { method: "POST", body: validBody }));
    expect(res.status).toBe(404);
  });

  it("returns 201 with created invoice", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(CLIENT);
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.invoice.create.mockResolvedValue(INVOICE);

    const res = await postInvoice(makeRequest("/api/invoices", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.invoiceNumber).toBe("INV-0001");
    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-abc" }),
      })
    );
  });
});

// ── GET /api/invoices/[id] ────────────────────────────────────────────────────

describe("GET /api/invoices/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await getInvoice(makeRequest("/api/invoices/inv-001"), {
      params: { id: "inv-001" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when invoice not found", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(null);

    const res = await getInvoice(makeRequest("/api/invoices/unknown"), {
      params: { id: "unknown" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with invoice data", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(INVOICE);

    const res = await getInvoice(makeRequest("/api/invoices/inv-001"), {
      params: { id: "inv-001" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("inv-001");
  });

  it("transitions SENT invoice to VIEWED and logs activity", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const sentInvoice = { ...INVOICE, status: "SENT" as const, viewedAt: null };
    prismaMock.invoice.findFirst.mockResolvedValue(sentInvoice);
    prismaMock.invoice.update.mockResolvedValue({ ...sentInvoice, status: "VIEWED" });
    prismaMock.invoiceActivity.create.mockResolvedValue({});

    await getInvoice(makeRequest("/api/invoices/inv-001"), { params: { id: "inv-001" } });

    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});

// ── PATCH /api/invoices/[id] ──────────────────────────────────────────────────

describe("PATCH /api/invoices/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await patchInvoice(
      makeRequest("/api/invoices/inv-001", { method: "PATCH", body: { notes: "Updated" } }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when invoice not found", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(null);

    const res = await patchInvoice(
      makeRequest("/api/invoices/unknown", { method: "PATCH", body: { notes: "X" } }),
      { params: { id: "unknown" } }
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when invoice is PAID", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue({ ...INVOICE, status: "PAID" });

    const res = await patchInvoice(
      makeRequest("/api/invoices/inv-001", { method: "PATCH", body: { notes: "X" } }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(409);
  });

  it("returns 409 when invoice is CANCELLED", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue({ ...INVOICE, status: "CANCELLED" });

    const res = await patchInvoice(
      makeRequest("/api/invoices/inv-001", { method: "PATCH", body: { notes: "X" } }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(409);
  });

  it("returns 200 with updated invoice", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(INVOICE);
    const updated = { ...INVOICE, notes: "Updated note" };
    prismaMock.invoice.update.mockResolvedValue(updated);

    const res = await patchInvoice(
      makeRequest("/api/invoices/inv-001", {
        method: "PATCH",
        body: { notes: "Updated note" },
      }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.notes).toBe("Updated note");
  });
});

// ── DELETE /api/invoices/[id] ─────────────────────────────────────────────────

describe("DELETE /api/invoices/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await deleteInvoice(
      makeRequest("/api/invoices/inv-001", { method: "DELETE" }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when invoice not found", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(null);

    const res = await deleteInvoice(
      makeRequest("/api/invoices/unknown", { method: "DELETE" }),
      { params: { id: "unknown" } }
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when invoice is not DRAFT", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue({ ...INVOICE, status: "SENT" });

    const res = await deleteInvoice(
      makeRequest("/api/invoices/inv-001", { method: "DELETE" }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful delete", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(INVOICE);
    prismaMock.invoice.delete.mockResolvedValue(INVOICE);

    const res = await deleteInvoice(
      makeRequest("/api/invoices/inv-001", { method: "DELETE" }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });
});

// ── PATCH /api/invoices/[id]/status ──────────────────────────────────────────

describe("PATCH /api/invoices/[id]/status", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await patchStatus(
      makeRequest("/api/invoices/inv-001/status", { method: "PATCH", body: { status: "PAID" } }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status value", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(INVOICE);

    const res = await patchStatus(
      makeRequest("/api/invoices/inv-001/status", {
        method: "PATCH",
        body: { status: "INVALID_STATUS" },
      }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(400);
  });

  it("updates status and logs activity", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(INVOICE);
    const paid = { ...INVOICE, status: "PAID" as const, paidAt: new Date() };
    prismaMock.invoice.update.mockResolvedValue(paid);
    prismaMock.invoiceActivity.create.mockResolvedValue({});

    const res = await patchStatus(
      makeRequest("/api/invoices/inv-001/status", {
        method: "PATCH",
        body: { status: "PAID" },
      }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("PAID");
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});

// ── POST /api/invoices/[id]/duplicate ────────────────────────────────────────

describe("POST /api/invoices/[id]/duplicate", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await duplicateInvoice(
      makeRequest("/api/invoices/inv-001/duplicate", { method: "POST" }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when source invoice not found", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(null);

    const res = await duplicateInvoice(
      makeRequest("/api/invoices/unknown/duplicate", { method: "POST" }),
      { params: { id: "unknown" } }
    );
    expect(res.status).toBe(404);
  });

  it("creates a DRAFT duplicate with new invoice number", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.invoice.findFirst.mockResolvedValue(INVOICE);
    prismaMock.invoice.count.mockResolvedValue(1);
    const duplicate = { ...INVOICE, id: "inv-002", invoiceNumber: "INV-0002", status: "DRAFT" as const };
    prismaMock.invoice.create.mockResolvedValue(duplicate);
    prismaMock.invoiceActivity.create.mockResolvedValue({});

    const res = await duplicateInvoice(
      makeRequest("/api/invoices/inv-001/duplicate", { method: "POST" }),
      { params: { id: "inv-001" } }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.status).toBe("DRAFT");
    expect(body.data.invoiceNumber).toBe("INV-0002");
  });
});
