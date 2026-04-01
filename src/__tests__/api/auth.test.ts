/**
 * Integration tests for auth API routes:
 *   POST /api/auth/register
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *   POST /api/user/change-password
 *   DELETE /api/user/delete
 */

import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMock } from "../helpers/mock-prisma";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ success: true, remaining: 4, resetIn: 3600 }),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@/lib/email", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

const prismaMock = getPrismaMock();
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prismaMock }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as forgotPasswordRoute } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordRoute } from "@/app/api/auth/reset-password/route";
import { POST as changePasswordRoute } from "@/app/api/user/change-password/route";
import { DELETE as deleteRoute } from "@/app/api/user/delete/route";
import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000").toString(), {
    method: options.method ?? "POST",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

const SESSION = { user: { id: "user-abc", email: "test@example.com" } };

const BASE_USER = {
  id: "user-abc",
  email: "test@example.com",
  fullName: "Test User",
  passwordHash: "hashed_password",
  businessName: null,
  businessAddress: null,
  businessPhone: null,
  logoUrl: null,
  currency: "USD",
  locale: "en-US",
  stripeCustomerId: null,
  plan: "FREE" as const,
  planExpiresAt: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  resetPrismaMock();
  mockGetServerSession.mockReset();
  (checkRateLimit as jest.Mock).mockReturnValue({ success: true, remaining: 4, resetIn: 3600 });
  (bcrypt.compare as jest.Mock).mockReset();
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 400 for missing email", async () => {
    const res = await registerRoute(
      makeRequest("/api/auth/register", { body: { password: "pass1234" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for password shorter than 8 chars", async () => {
    const res = await registerRoute(
      makeRequest("/api/auth/register", { body: { email: "a@b.com", password: "short" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    (checkRateLimit as jest.Mock).mockReturnValueOnce({ success: false, remaining: 0, resetIn: 900 });
    const res = await registerRoute(
      makeRequest("/api/auth/register", { body: { email: "a@b.com", password: "password123" } })
    );
    expect(res.status).toBe(429);
  });

  it("returns 409 when email already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    const res = await registerRoute(
      makeRequest("/api/auth/register", { body: { email: "test@example.com", password: "password123" } })
    );
    expect(res.status).toBe(409);
  });

  it("returns 201 and creates user on success", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(BASE_USER);

    const res = await registerRoute(
      makeRequest("/api/auth/register", {
        body: { email: "new@example.com", password: "password123", fullName: "Jane" },
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.email).toBe("new@example.com");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@example.com",
          passwordHash: "hashed_password",
          fullName: "Jane",
        }),
      })
    );
  });

  it("normalises email to lowercase", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(BASE_USER);

    await registerRoute(
      makeRequest("/api/auth/register", {
        body: { email: "UPPER@EXAMPLE.COM", password: "password123" },
      })
    );
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "upper@example.com" } });
  });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 for invalid email", async () => {
    const res = await forgotPasswordRoute(
      makeRequest("/api/auth/forgot-password", { body: { email: "not-an-email" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 even when user does not exist (anti-enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await forgotPasswordRoute(
      makeRequest("/api/auth/forgot-password", { body: { email: "ghost@example.com" } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("reset link has been sent");
  });

  it("creates a reset token and sends email when user exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({});

    const { sendPasswordResetEmail } = jest.requireMock("@/lib/email") as {
      sendPasswordResetEmail: jest.Mock;
    };

    const res = await forgotPasswordRoute(
      makeRequest("/api/auth/forgot-password", { body: { email: "test@example.com" } })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalled();
    expect(sendPasswordResetEmail).toHaveBeenCalled();
  });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  it("returns 400 for missing token", async () => {
    const res = await resetPasswordRoute(
      makeRequest("/api/auth/reset-password", { body: { password: "newpass123" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid (non-existent) token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
    const res = await resetPasswordRoute(
      makeRequest("/api/auth/reset-password", { body: { token: "bad-token", password: "newpass123" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid|expired/i);
  });

  it("returns 400 for already-used token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: "tok-1",
      userId: "user-abc",
      token: "good-token",
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: new Date(),
      user: BASE_USER,
    });
    const res = await resetPasswordRoute(
      makeRequest("/api/auth/reset-password", { body: { token: "good-token", password: "newpass123" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already been used/i);
  });

  it("returns 400 for expired token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: "tok-1",
      userId: "user-abc",
      token: "good-token",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      user: BASE_USER,
    });
    const res = await resetPasswordRoute(
      makeRequest("/api/auth/reset-password", { body: { token: "good-token", password: "newpass123" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it("returns 200 and updates password for valid token", async () => {
    const validToken = {
      id: "tok-1",
      userId: "user-abc",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      user: BASE_USER,
    };
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(validToken);
    prismaMock.user.update.mockResolvedValue(BASE_USER);
    prismaMock.passwordResetToken.update.mockResolvedValue(validToken);

    const res = await resetPasswordRoute(
      makeRequest("/api/auth/reset-password", { body: { token: "valid-token", password: "newpass123" } })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-abc" },
        data: { passwordHash: "hashed_password" },
      })
    );
  });
});

// ─── POST /api/user/change-password ──────────────────────────────────────────

describe("POST /api/user/change-password", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await changePasswordRoute(
      makeRequest("/api/user/change-password", {
        body: { currentPassword: "old", newPassword: "newpass123" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 if newPassword is too short", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    const res = await changePasswordRoute(
      makeRequest("/api/user/change-password", {
        body: { currentPassword: "oldpass123", newPassword: "short" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for OAuth-only user (no passwordHash)", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ ...BASE_USER, passwordHash: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const res = await changePasswordRoute(
      makeRequest("/api/user/change-password", {
        body: { currentPassword: "anything", newPassword: "newpass123" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/OAuth/i);
  });

  it("returns 400 when current password is wrong", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const res = await changePasswordRoute(
      makeRequest("/api/user/change-password", {
        body: { currentPassword: "wrongpass", newPassword: "newpass123" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/incorrect/i);
  });

  it("returns 200 and updates password on success", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue(BASE_USER);

    const res = await changePasswordRoute(
      makeRequest("/api/user/change-password", {
        body: { currentPassword: "correctpass", newPassword: "newpass123" },
      })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      data: { passwordHash: "hashed_password" },
    });
  });
});

// ─── DELETE /api/user/delete ──────────────────────────────────────────────────

describe("DELETE /api/user/delete", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await deleteRoute(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for wrong confirmation phrase", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await deleteRoute(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "delete my account" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when password-user omits password field", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    const res = await deleteRoute(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/password/i);
  });

  it("returns 400 when password is incorrect", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const res = await deleteRoute(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT", password: "wrongpass" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/incorrect/i);
  });

  it("returns 200 and deletes user on valid request", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(BASE_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.user.delete.mockResolvedValue(BASE_USER);

    const res = await deleteRoute(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT", password: "correctpass" },
      })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user-abc" } });
  });

  it("deletes OAuth user without requiring password", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue({ ...BASE_USER, passwordHash: null });
    prismaMock.user.delete.mockResolvedValue(BASE_USER);

    const res = await deleteRoute(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT" },
      })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user-abc" } });
  });
});
