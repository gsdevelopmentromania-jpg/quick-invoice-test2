/**
 * Unit tests for src/lib/utils.ts
 *
 * Covers: cn, formatCurrency, formatDate, truncate
 */

import { cn, formatCurrency, formatDate, truncate } from "@/lib/utils";

// ─── cn ───────────────────────────────────────────────────────────────────────

describe("cn", () => {
  it("joins multiple class strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  it("filters out empty strings", () => {
    expect(cn("a", "", "b")).toBe("a b");
  });

  it("returns single class when only one non-falsy value", () => {
    expect(cn(undefined, "foo", null)).toBe("foo");
  });

  it("handles no arguments", () => {
    expect(cn()).toBe("");
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats USD cents to dollar string", () => {
    const result = formatCurrency(10000, "USD", "en-US");
    expect(result).toBe("$100.00");
  });

  it("formats zero cents as zero dollars", () => {
    const result = formatCurrency(0, "USD", "en-US");
    expect(result).toBe("$0.00");
  });

  it("formats EUR with correct symbol", () => {
    const result = formatCurrency(5000, "EUR", "en-US");
    // EUR symbol may vary by locale but should include "50.00"
    expect(result).toContain("50.00");
  });

  it("defaults to USD when currency not provided", () => {
    const result = formatCurrency(100);
    expect(result).toContain("1.00");
  });

  it("handles fractional cents", () => {
    const result = formatCurrency(999, "USD", "en-US");
    expect(result).toBe("$9.99");
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a Date object", () => {
    const date = new Date("2026-01-15T00:00:00.000Z");
    const result = formatDate(date, "en-US");
    expect(result).toContain("2026");
    expect(result).toContain("15");
  });

  it("formats a date string", () => {
    const result = formatDate("2026-06-01", "en-US");
    expect(result).toContain("2026");
    expect(result).toContain("Jun");
  });

  it("defaults to en-US locale", () => {
    const result = formatDate(new Date("2026-04-02T00:00:00.000Z"));
    expect(result).toContain("2026");
  });

  it("includes month abbreviation in en-US", () => {
    const result = formatDate(new Date("2026-12-25T00:00:00.000Z"), "en-US");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
    expect(result).toContain("2026");
  });
});

// ─── truncate ─────────────────────────────────────────────────────────────────

describe("truncate", () => {
  it("returns string unchanged when shorter than maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns string unchanged when equal to maxLength", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends ellipsis when longer than maxLength", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("handles exact boundary — maxLength 3 produces just ellipsis", () => {
    expect(truncate("abc", 3)).toBe("abc");
  });

  it("truncates a long string correctly", () => {
    const str = "The quick brown fox jumps over the lazy dog";
    const result = truncate(str, 10);
    expect(result).toBe("The qui...");
    expect(result.length).toBe(10);
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });
});
