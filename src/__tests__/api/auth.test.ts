/**
 * Auth API integration tests
 *
 * Covers the full auth flow:
 *   register → email verification → login (via NextAuth) → forgot password →
 *   reset password → change password → account deletion
 *
 * Each route is tested for: rate limiting, validation, happy path, edge cases.
 */

import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMock } from "../helpers/mock-prisma";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCheckRateLimit = jest
  .fn()
  .mockReturnValue({ success: true, remaining: 4, resetIn: 3600 });
const mockGetClientIp = jest.fn().mockReturnValue("127.0.0.1");

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

const mockSendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
const mockSendEmailVerificationEmail = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/email", () => ({
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
  sendEmailVerificationEmail: (...args: unknown[]) =>
    mockSendEmailVerificationEmail(...args),
}));

const mockBcryptHash = jest.fn().mockResolvedValue("hashed-password");
const mockBcryptCompare = jest.fn();

jest.mock("bcryptjs", () => ({
  hash: (...args: unknown[]) => mockBcryptHash(...args),
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
}));

const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

const prismaMock = getPrismaMock();
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prismaMock }));

// ─── Route imports (after mocks) ─────────────────────────────────────────────

import { POST as register } from "@/app/api/auth/register/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { GET as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as resendVerification } from "@/app/api/auth/resend-verification/route";
import { POST as changePassword } from "@/app/api/user/change-password/route";
import { DELETE as deleteAccount } from "@/app/api/user/delete/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {}
) {
  const urlObj = new URL(url, "http://localhost:3000");
  if (options.searchParams) {
    for (const key of Object.keys(options.searchParams)) {
      urlObj.searchParams.set(key, options.searchParams[key]);
    }
  }
  return new NextRequest(urlObj.toString(), {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-abc", email: "test@example.com" } };

const USER = {
  id: "user-abc",
  email: "test@example.com",
  fullName: "Test User",
  passwordHash: "stored-hash",
  emailVerified: new Date(),
  businessName: null,
  businessAddress: null,
  businessPhone: null,
  logoUrl: null,
  currency: "USD",
  locale: "en-US",
  stripeCustomerId: null,
  plan: "FREE" as const,
  planExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const OAUTH_USER = { ...USER, passwordHash: null };
const UNVERIFIED_USER = { ...USER, emailVerified: null };

const VALID_RESET_TOKEN = {
  id: "rt-valid",
  userId: "user-abc",
  token: "valid-reset-token",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  usedAt: null,
  user: USER,
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetPrismaMock();
  mockCheckRateLimit.mockReturnValue({ success: true, remaining: 4, resetIn: 3600 });
  mockGetServerSession.mockReset();
  mockBcryptCompare.mockReset();
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
  mockSendEmailVerificationEmail.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 100 });
    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "new@example.com", password: "password123" },
      })
    );
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid email", async () => {
    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "not-an-email", password: "password123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for password shorter than 8 characters", async () => {
    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "user@example.com", password: "short" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates user, verification token, and sends email on success", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(USER);
    prismaMock.verificationToken.create.mockResolvedValue({});

    const res = await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "new@example.com", password: "password123", fullName: "New User" },
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.email).toBe("new@example.com");
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.verificationToken.create).toHaveBeenCalledTimes(1);

    // Give fire-and-forget a tick to flush
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendEmailVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("normalizes email to lowercase", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(USER);
    prismaMock.verificationToken.create.mockResolvedValue({});

    await register(
      makeRequest("/api/auth/register", {
        method: "POST",
        body: { email: "USER@EXAMPLE.COM", password: "password123" },
      })
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-email
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/auth/verify-email", () => {
  it("returns 400 when token or email params are missing", async () => {
    const res = await verifyEmail(makeRequest("/api/auth/verify-email"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when token does not exist in DB", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);
    const res = await verifyEmail(
      makeRequest("/api/auth/verify-email", {
        searchParams: { token: "nonexistent", email: "test@example.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when identifier does not match email param", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "other@example.com",
      token: "sometoken",
      expires: new Date(Date.now() + 60000),
    });
    const res = await verifyEmail(
      makeRequest("/api/auth/verify-email", {
        searchParams: { token: "sometoken", email: "test@example.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 and deletes the token when it has expired", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "test@example.com",
      token: "expiredtoken",
      expires: new Date(Date.now() - 1000),
    });
    prismaMock.verificationToken.delete.mockResolvedValue({});

    const res = await verifyEmail(
      makeRequest("/api/auth/verify-email", {
        searchParams: { token: "expiredtoken", email: "test@example.com" },
      })
    );

    expect(res.status).toBe(400);
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: "expiredtoken" },
    });
  });

  it("marks email verified and deletes token on success", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: "test@example.com",
      token: "validtoken",
      expires: new Date(Date.now() + 60000),
    });

    const res = await verifyEmail(
      makeRequest("/api/auth/verify-email", {
        searchParams: { token: "validtoken", email: "test@example.com" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.verified).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/resend-verification", () => {
  it("returns 429 when IP rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 100 });
    const res = await resendVerification(
      makeRequest("/api/auth/resend-verification", {
        method: "POST",
        body: { email: "test@example.com" },
      })
    );
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid email", async () => {
    const res = await resendVerification(
      makeRequest("/api/auth/resend-verification", {
        method: "POST",
        body: { email: "bad-email" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 without sending when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await resendVerification(
      makeRequest("/api/auth/resend-verification", {
        method: "POST",
        body: { email: "nobody@example.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSendEmailVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns 200 without sending when email is already verified", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);
    const res = await resendVerification(
      makeRequest("/api/auth/resend-verification", {
        method: "POST",
        body: { email: "test@example.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSendEmailVerificationEmail).not.toHaveBeenCalled();
  });

  it("replaces old token and sends new verification email for unverified user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(UNVERIFIED_USER);
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.verificationToken.create.mockResolvedValue({});

    const res = await resendVerification(
      makeRequest("/api/auth/resend-verification", {
        method: "POST",
        body: { email: "test@example.com" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.sent).toBe(true);
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.verificationToken.create).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendEmailVerificationEmail).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 100 });
    const res = await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "test@example.com" },
      })
    );
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid email", async () => {
    const res = await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "bad" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 even when email does not exist (prevents enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "ghost@example.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 200 without sending for OAuth-only user (no passwordHash)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(OAUTH_USER);
    const res = await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "oauth@example.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates reset token and sends email for valid password-based user", async () => {
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
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it("invalidates existing reset tokens before creating a new one", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.passwordResetToken.create.mockResolvedValue({});

    await forgotPassword(
      makeRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "test@example.com" },
      })
    );

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER.id, usedAt: null }),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 100 });
    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "t", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing token", async () => {
    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for password shorter than 8 characters", async () => {
    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "sometoken", password: "short" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-existent token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "unknowntoken", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for already-used token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      ...VALID_RESET_TOKEN,
      usedAt: new Date(),
    });
    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "usedtoken", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already been used");
  });

  it("returns 400 for expired token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      ...VALID_RESET_TOKEN,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "expiredtoken", password: "newpassword123" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("expired");
  });

  it("updates password and marks token used on success", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(VALID_RESET_TOKEN);

    const res = await resetPassword(
      makeRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: "valid-reset-token", password: "newpassword123" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("Password updated");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/user/change-password
// ─────────────────────────────────────────────────────────────────────────────

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

  it("returns 400 for new password shorter than 8 characters", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await changePassword(
      makeRequest("/api/user/change-password", {
        method: "POST",
        body: { currentPassword: "currentpassword", newPassword: "short" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for OAuth user who has no password hash", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(OAUTH_USER);

    const res = await changePassword(
      makeRequest("/api/user/change-password", {
        method: "POST",
        body: { currentPassword: "any", newPassword: "newpassword123" },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("OAuth");
  });

  it("returns 400 when current password is incorrect", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    mockBcryptCompare.mockResolvedValue(false);

    const res = await changePassword(
      makeRequest("/api/user/change-password", {
        method: "POST",
        body: { currentPassword: "wrongpassword", newPassword: "newpassword123" },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("incorrect");
  });

  it("updates password hash and returns 200 on success", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    mockBcryptCompare.mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue(USER);

    const res = await changePassword(
      makeRequest("/api/user/change-password", {
        method: "POST",
        body: { currentPassword: "currentpassword", newPassword: "newpassword123" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.changed).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: SESSION.user.id },
      data: { passwordHash: "hashed-password" },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/user/delete
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/user/delete", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await deleteAccount(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 without the correct confirmation phrase", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await deleteAccount(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "delete my account" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when password-based user omits password field", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);

    const res = await deleteAccount(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT" },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("password");
  });

  it("returns 400 when provided password is incorrect", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    mockBcryptCompare.mockResolvedValue(false);

    const res = await deleteAccount(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT", password: "wrongpassword" },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Incorrect password");
  });

  it("deletes password-based account after correct password + phrase", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    mockBcryptCompare.mockResolvedValue(true);
    prismaMock.user.delete.mockResolvedValue(USER);

    const res = await deleteAccount(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT", password: "currentpassword" },
      })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: SESSION.user.id },
    });
  });

  it("deletes OAuth account without requiring a password", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    prismaMock.user.findUnique.mockResolvedValue(OAUTH_USER);
    prismaMock.user.delete.mockResolvedValue(OAUTH_USER);

    const res = await deleteAccount(
      makeRequest("/api/user/delete", {
        method: "DELETE",
        body: { confirmation: "DELETE MY ACCOUNT" },
      })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: SESSION.user.id },
    });
  });
});
