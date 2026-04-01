/**
 * Integration tests for /api/user/profile
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

// ─── Imports ─────────────────────────────────────────────────────────────────

import { GET as getProfile, PATCH as patchProfile } from "@/app/api/user/profile/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-abc", email: "test@example.com" } };

const USER = {
  id: "user-abc",
  email: "test@example.com",
  fullName: "Test User",
  businessName: "Test Co",
  businessAddress: "1 Test St",
  businessPhone: "555-0000",
  logoUrl: null,
  currency: "USD",
  locale: "en-US",
  stripeCustomerId: null,
  plan: "FREE" as const,
  planExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
) {
  return new NextRequest(new URL(url, "http://localhost:3000").toString(), {
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

describe("GET /api/user/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await getProfile(makeRequest("/api/user/profile"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when user record does not exist", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await getProfile(makeRequest("/api/user/profile"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with user profile", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);

    const res = await getProfile(makeRequest("/api/user/profile"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe("test@example.com");
    expect(body.data.id).toBe("user-abc");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-abc" },
    });
  });
});

describe("PATCH /api/user/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await patchProfile(
      makeRequest("/api/user/profile", { method: "PATCH", body: { fullName: "Jane" } })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (bad URL in logoUrl)", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await patchProfile(
      makeRequest("/api/user/profile", {
        method: "PATCH",
        body: { logoUrl: "not-a-url" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty fullName", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await patchProfile(
      makeRequest("/api/user/profile", {
        method: "PATCH",
        body: { fullName: "" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for currency not 3 chars", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await patchProfile(
      makeRequest("/api/user/profile", {
        method: "PATCH",
        body: { currency: "US" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated profile", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const updated = { ...USER, fullName: "Jane Doe", businessName: "Jane's Co" };
    prismaMock.user.update.mockResolvedValue(updated);

    const res = await patchProfile(
      makeRequest("/api/user/profile", {
        method: "PATCH",
        body: { fullName: "Jane Doe", businessName: "Jane's Co" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.fullName).toBe("Jane Doe");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      data: { fullName: "Jane Doe", businessName: "Jane's Co" },
    });
  });

  it("updates only provided fields", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.update.mockResolvedValue({ ...USER, currency: "EUR" });

    await patchProfile(
      makeRequest("/api/user/profile", { method: "PATCH", body: { currency: "EUR" } })
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      data: { currency: "EUR" },
    });
  });
});
