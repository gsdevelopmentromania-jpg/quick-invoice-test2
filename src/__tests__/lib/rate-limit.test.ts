/**
 * Unit tests for src/lib/rate-limit.ts
 *
 * Covers: checkRateLimit (sliding window), getClientIp
 *
 * The rate limiter uses a module-level Map; tests use unique identifiers
 * per test to avoid cross-test state pollution.
 */

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ─── checkRateLimit ───────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  it("allows the first request", () => {
    const result = checkRateLimit("test:first-request-1", 5, 60);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it("allows requests up to the limit", () => {
    const id = "test:up-to-limit-1";
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit(id, 3, 60);
      expect(r.success).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    const id = "test:exceed-limit-1";
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id, 3, 60);
    }
    const blocked = checkRateLimit(id, 3, 60);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("remaining decrements correctly", () => {
    const id = "test:decrement-1";
    const r1 = checkRateLimit(id, 5, 60);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit(id, 5, 60);
    expect(r2.remaining).toBe(3);

    const r3 = checkRateLimit(id, 5, 60);
    expect(r3.remaining).toBe(2);
  });

  it("returns resetIn > 0 for a new window", () => {
    const result = checkRateLimit("test:reset-in-1", 10, 30);
    expect(result.resetIn).toBeGreaterThan(0);
    expect(result.resetIn).toBeLessThanOrEqual(30);
  });

  it("treats different identifiers as independent windows", () => {
    const id1 = "test:independent-a";
    const id2 = "test:independent-b";

    // Exhaust id1
    for (let i = 0; i < 2; i++) {
      checkRateLimit(id1, 2, 60);
    }
    const blockedA = checkRateLimit(id1, 2, 60);
    expect(blockedA.success).toBe(false);

    // id2 should still be allowed
    const allowedB = checkRateLimit(id2, 2, 60);
    expect(allowedB.success).toBe(true);
  });

  it("returns success false and remaining 0 when over limit", () => {
    const id = "test:over-limit-1";
    checkRateLimit(id, 1, 60);
    const result = checkRateLimit(id, 1, 60);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });
});

// ─── getClientIp ─────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  function makeHeaders(entries: Record<string, string>): Headers {
    return new Headers(entries);
  }

  it("returns the first IP from x-forwarded-for", () => {
    const headers = makeHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("handles x-forwarded-for with a single IP", () => {
    const headers = makeHeaders({ "x-forwarded-for": "192.168.1.100" });
    expect(getClientIp(headers)).toBe("192.168.1.100");
  });

  it("trims whitespace from the extracted IP", () => {
    const headers = makeHeaders({ "x-forwarded-for": "  10.0.0.1  , 10.0.0.2" });
    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = makeHeaders({ "x-real-ip": "9.8.7.6" });
    expect(getClientIp(headers)).toBe("9.8.7.6");
  });

  it("returns unknown when neither header is present", () => {
    const headers = makeHeaders({});
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const headers = makeHeaders({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
    });
    expect(getClientIp(headers)).toBe("1.1.1.1");
  });
});
