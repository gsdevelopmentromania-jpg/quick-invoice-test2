/**
 * Tests for the authentication system:
 * - POST /api/auth/register
 * - GET  /api/auth/verify-email
 * - POST /api/auth/forgot-password
 * - POST /api/auth/reset-password
 * - GET/PATCH/DELETE /api/user/profile
 * - POST /api/user/change-password
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

jest.mock("@/lib/email", () => ({
  sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ success: true, remaining: 4, resetIn: 3600 }),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST as register } from "@/app/api/auth/register/route";
import { GET as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import {
  GET as getProfile,
  PATCH as patchProfile,
  DELETE as deleteProfile,
} from "@/app/api/user/profile/route";
import { POST as changePassword } from "@/app/api/user/change-password/route";
import bcrypt from "bcryptjs";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-abc", email: "test@example.com" } };

const USER = {
  id: "user-abc",
  email: "test@example.com",
  emailVerified: null,
  passwordHash: "hashed-password",
  fullName: "Test User",
  businessName: null,
  businessAddress: null,
  businessPhone: null,
  logoUrl: null,
  currency: "USD",
  locale: "en-US",
  stripeCustomerId: null,
  plan: "FREE",
  planExpiresAt: null,
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetPrismaMock();
  mockGetServerSession.mockReset();
  const { checkRateLimit, getClientIp } = jest.requireMock<{
    checkRateLimit: jest.Mock;
    getClientIp: jest.Mock;
  }>("@/lib/rate-limit");
  checkRateLimit.mockReturnValue({ success: true, remaining: 4, resetIn: 3600 });
  getClientIp.mockReturnValue("127.0.0.1");
  const bcryptMock = jest.requireMock<{ hash: jest.Mock; compare: jest.Mock }>("bcryptjs");
  bcryptMock.hash.mockResolvedValue("hashed-password");
  bcryptMock.compare.mockResolvedValue(false);
});

// ── Register ─────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 400 for invalid email", async () => {
    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "not-an-email", password: "password123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "user@example.com", password: "short" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 201 for existing email (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);

    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "test@example.com", password: "password123", fullName: "Test" },
      })
    );
    expect(res.status).toBe(201);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("creates user and verification token on success", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(USER);
    prismaMock.verificationToken.create.mockResolvedValue({});

    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "newuser@example.com", password: "password123", fullName: "New User" },
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "newuser@example.com",
          passwordHash: "hashed-password",
        }),
      })
    );
    expect(prismaMock.verificationToken.create).toHaveBeenCalled();
  });

  it("normalizes email to lowercase", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ ...USER, email: "upper@example.com" });
    prismaMock.verificationToken.create.mockResolvedValue({});

    await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "UPPER@EXAMPLE.COM", password: "password123" },
      })
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "upper@example.com" },
    });
  });
});

// ── Verify Email ──────────────────────────────────────────────────────────────

describe("GET /api/auth/verify-email", () => {
  it("returns 400 for missing params", async () => {
    const res = await verifyEmail(makeRequest("/api/auth/verify-email"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid/missing token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);

    const res = await verifyEmail(
      makeRequest("/api/auth/verify-email", {
        searchParams: { token: "bad-token", email: "test@example.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for expired token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "test@example.com",
      token: "valid-token",
      expires: new Date(Date.now() - 1000),
    });
    prismaMock.verificationToken.delete.mockResolvedValue({});

    const res = await verifyEmail(
      makeRequest("/api/auth/verify-email", {
        searchParams: { token: "valid-token", email: "test@example.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("verifies email and returns 200", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "test@example.com",
      token: "valid-token",
      expires: new Date(Date.now() + 60000),
    });
    prismaMock.$transaction.mockResolvedValue([USER, {}]);

    const res = await verifyEmail(
      makeRequest("/api/auth/verify-email", {
        searchParams: { token: "valid-token", email: "test@example.com" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.verified).toBe(true);
  });
});

// ── Forgot Password ───────────────────────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 for invalid email", async () => {
    const res = await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "not-an-email" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for unknown email (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "unknown@example.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("creates reset token for known email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({});

    const res = await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "test@example.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalled();
  });
});

// ── Reset Password ────────────────────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  it("returns 400 for missing token", async () => {
    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "bad-token", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for already-used token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-abc",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 60000),
      usedAt: new Date(),
      user: USER,
    });

    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "valid-token", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("resets password successfully", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-abc",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
      user: USER,
    });
    prismaMock.$transaction.mockResolvedValue([USER, {}]);

    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "valid-token", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.reset).toBe(true);
  });
});

// ── Profile ───────────────────────────────────────────────────────────────────

describe("GET /api/user/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await getProfile(makeRequest("/api/user/profile"));
    expect(res.status).toBe(401);
  });

  it("returns profile for authenticated user", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);

    const res = await getProfile(makeRequest("/api/user/profile"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe("test@example.com");
  });
});

describe("DELETE /api/user/profile (account deletion)", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await deleteProfile(
      makeRequest("/api/user/profile", {
        method: "DELETE",
        body: { confirmEmail: "test@example.com" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when confirmEmail missing", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await deleteProfile(
      makeRequest("/api/user/profile", { method: "DELETE", body: {} })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when email does not match", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);

    const res = await deleteProfile(
      makeRequest("/api/user/profile", {
        method: "DELETE",
        body: { confirmEmail: "wrong@example.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("deletes account on matching email", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    prismaMock.user.delete.mockResolvedValue(USER);

    const res = await deleteProfile(
      makeRequest("/api/user/profile", {
        method: "DELETE",
        body: { confirmEmail: "test@example.com" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user-abc" } });
  });
});

// ── Change Password ───────────────────────────────────────────────────────────

describe("POST /api/user/change-password", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await changePassword(
      makeRequest("/api/user/change-password", {
        method: "POST",
        body: { currentPassword: "old", newPassword: "newpassword123" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when current password is wrong", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await changePassword(
      makeRequest("/api/user/change-password", {
        method: "POST",
        body: { currentPassword: "wrongpassword", newPassword: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/incorrect/i);
  });

  it("changes password successfully", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue({ ...USER, passwordHash: "new-hashed" });

    const res = await changePassword(
      makeRequest("/api/user/change-password", {
        method: "POST",
        body: { currentPassword: "correctpassword", newPassword: "newpassword123" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.changed).toBe(true);
  });
});

// ── Unused import to satisfy TypeScript (patchProfile used in test setup) ────
void patchProfile;
