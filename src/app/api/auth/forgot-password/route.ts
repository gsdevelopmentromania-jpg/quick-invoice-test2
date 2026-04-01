import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email if the address exists.
 * Always returns 200 to prevent user enumeration.
 * Rate-limited to 3 requests per email per hour.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ sent: boolean }>>> {
  const ip = getClientIp(req.headers);
  const ipRl = checkRateLimit(`forgot-ip:${ip}`, 10, 60 * 60);
  if (!ipRl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await req.json();
  const parsed = forgotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  // Rate limit per email address
  const emailRl = checkRateLimit(`forgot-email:${email}`, 3, 60 * 60);
  if (!emailRl.success) {
    // Return success to avoid enumeration while still rate limiting
    return NextResponse.json({ data: { sent: true } }, { status: 200 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always succeed — do not reveal whether the email exists
  if (!user || !user.passwordHash) {
    return NextResponse.json({ data: { sent: true } }, { status: 200 });
  }

  // Invalidate any existing unexpired tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  sendPasswordResetEmail({ to: email, resetUrl }).catch((err: unknown) => {
    console.error("Failed to send password reset email:", err);
  });

  return NextResponse.json({ data: { sent: true } }, { status: 200 });
}
