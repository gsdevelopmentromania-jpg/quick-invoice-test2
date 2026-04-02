/**
 * Integration tests for GET /api/health
 *
 * getHealthReport and logger are mocked so no real DB or Stripe calls occur.
 */

import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetHealthReport = jest.fn();

jest.mock("@/lib/health", () => ({
  getHealthReport: (...args: unknown[]) => mockGetHealthReport(...args),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// ─── Imports (after mocks are hoisted) ───────────────────────────────────────

import { GET } from "@/app/api/health/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHealthyReport() {
  return {
    status: "healthy" as const,
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    uptime: 1234.5,
    checks: [
      { name: "database", status: "healthy" as const, latencyMs: 5 },
      { name: "stripe", status: "healthy" as const, latencyMs: 1 },
      { name: "email", status: "healthy" as const, latencyMs: 1 },
    ],
  };
}

function makeRequest(): NextRequest {
  return new NextRequest(
    new URL("/api/health", "http://localhost:3000").toString(),
    { method: "GET" }
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetHealthReport.mockReset();
});

describe("GET /api/health", () => {
  it("returns 200 with healthy report when all services are up", async () => {
    mockGetHealthReport.mockResolvedValue(makeHealthyReport());

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.checks).toHaveLength(3);
  });

  it("sets X-Health-Status header to healthy", async () => {
    mockGetHealthReport.mockResolvedValue(makeHealthyReport());

    const res = await GET();
    expect(res.headers.get("X-Health-Status")).toBe("healthy");
  });

  it("sets Cache-Control to no-store", async () => {
    mockGetHealthReport.mockResolvedValue(makeHealthyReport());

    const res = await GET();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns 200 for a degraded report", async () => {
    mockGetHealthReport.mockResolvedValue({
      ...makeHealthyReport(),
      status: "degraded",
      checks: [
        { name: "database", status: "healthy", latencyMs: 5 },
        { name: "stripe", status: "degraded", latencyMs: 0, message: "Invalid key format" },
        { name: "email", status: "degraded", latencyMs: 0, message: "RESEND_API_KEY not configured" },
      ],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
  });

  it("returns 503 for an unhealthy report", async () => {
    mockGetHealthReport.mockResolvedValue({
      ...makeHealthyReport(),
      status: "unhealthy",
      checks: [
        { name: "database", status: "unhealthy", latencyMs: 0, message: "Connection refused" },
        { name: "stripe", status: "healthy", latencyMs: 1 },
        { name: "email", status: "healthy", latencyMs: 1 },
      ],
    });

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("unhealthy");
  });

  it("returns 503 with fallback body when getHealthReport throws", async () => {
    mockGetHealthReport.mockRejectedValue(new Error("DB connection failed"));

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("unhealthy");
    expect(body.message).toBe("Health check failed");
  });

  it("includes version and uptime in response", async () => {
    mockGetHealthReport.mockResolvedValue(makeHealthyReport());

    const res = await GET();
    const body = await res.json();
    expect(body.version).toBe("0.1.0");
    expect(typeof body.uptime).toBe("number");
  });

  it("includes timestamp in ISO format", async () => {
    mockGetHealthReport.mockResolvedValue(makeHealthyReport());

    const res = await GET();
    const body = await res.json();
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
