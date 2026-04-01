/**
 * Integration tests for /api/clients and /api/clients/[id]
 *
 * Prisma and NextAuth are mocked — no real DB connection required.
 */

import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMock } from "../helpers/mock-prisma";

// ─── Mocks (must be declared before imports that use them) ───────────────────

const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

const prismaMock = getPrismaMock();
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prismaMock }));

// ─── Imports (after mocks are hoisted) ───────────────────────────────────────

import { GET as getClients, POST as postClient } from "@/app/api/clients/route";
import {
  GET as getClient,
  PATCH as patchClient,
  DELETE as deleteClient,
} from "@/app/api/clients/[id]/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-abc", email: "test@example.com" } };
const CLIENT = {
  id: "client-001",
  userId: "user-abc",
  name: "Acme Corp",
  email: "billing@acme.com",
  company: "Acme",
  address: "123 Main St",
  phone: "555-1234",
  currency: "USD",
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe("GET /api/clients", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await getClients(makeRequest("/api/clients"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns paginated clients for authenticated user", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findMany.mockResolvedValue([CLIENT]);
    prismaMock.client.count.mockResolvedValue(1);

    const res = await getClients(makeRequest("/api/clients"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.data).toHaveLength(1);
    expect(body.data.total).toBe(1);
    expect(body.data.page).toBe(1);
  });

  it("supports search parameter", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findMany.mockResolvedValue([CLIENT]);
    prismaMock.client.count.mockResolvedValue(1);

    await getClients(
      makeRequest("/api/clients", { searchParams: { search: "Acme", page: "1", pageSize: "10" } })
    );

    expect(prismaMock.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("respects page and pageSize params", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findMany.mockResolvedValue([]);
    prismaMock.client.count.mockResolvedValue(0);

    await getClients(
      makeRequest("/api/clients", { searchParams: { page: "2", pageSize: "10" } })
    );

    expect(prismaMock.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });
});

describe("POST /api/clients", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postClient(
      makeRequest("/api/clients", { method: "POST", body: { name: "X", email: "x@x.com" } })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid request body", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await postClient(
      makeRequest("/api/clients", { method: "POST", body: { name: "" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await postClient(
      makeRequest("/api/clients", {
        method: "POST",
        body: { name: "Jane", email: "not-an-email" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates and returns 201 with new client", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.create.mockResolvedValue(CLIENT);

    const res = await postClient(
      makeRequest("/api/clients", {
        method: "POST",
        body: { name: "Acme Corp", email: "billing@acme.com" },
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("Acme Corp");
    expect(prismaMock.client.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-abc" }) })
    );
  });
});

describe("GET /api/clients/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await getClient(makeRequest("/api/clients/client-001"), {
      params: { id: "client-001" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when client not found", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(null);

    const res = await getClient(makeRequest("/api/clients/unknown"), {
      params: { id: "unknown" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with client data", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(CLIENT);

    const res = await getClient(makeRequest("/api/clients/client-001"), {
      params: { id: "client-001" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("client-001");
  });
});

describe("PATCH /api/clients/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await patchClient(
      makeRequest("/api/clients/client-001", { method: "PATCH", body: { name: "New Name" } }),
      { params: { id: "client-001" } }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when client not found", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(null);

    const res = await patchClient(
      makeRequest("/api/clients/unknown", { method: "PATCH", body: { name: "New Name" } }),
      { params: { id: "unknown" } }
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid body", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(CLIENT);

    const res = await patchClient(
      makeRequest("/api/clients/client-001", {
        method: "PATCH",
        body: { email: "bad-email" },
      }),
      { params: { id: "client-001" } }
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated client", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(CLIENT);
    const updated = { ...CLIENT, name: "Updated Corp" };
    prismaMock.client.update.mockResolvedValue(updated);

    const res = await patchClient(
      makeRequest("/api/clients/client-001", {
        method: "PATCH",
        body: { name: "Updated Corp" },
      }),
      { params: { id: "client-001" } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Updated Corp");
  });
});

describe("DELETE /api/clients/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await deleteClient(makeRequest("/api/clients/client-001", { method: "DELETE" }), {
      params: { id: "client-001" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when client not found", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(null);

    const res = await deleteClient(makeRequest("/api/clients/unknown", { method: "DELETE" }), {
      params: { id: "unknown" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 on successful delete", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.client.findFirst.mockResolvedValue(CLIENT);
    prismaMock.client.delete.mockResolvedValue(CLIENT);

    const res = await deleteClient(
      makeRequest("/api/clients/client-001", { method: "DELETE" }),
      { params: { id: "client-001" } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });
});
