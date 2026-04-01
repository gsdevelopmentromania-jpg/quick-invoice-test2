import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
 * Generates a password-reset token, stores it in the DB, and emails the link.
 * Always returns 200 to prevent email enumeration attacks.
 * Rate limited to 3 attempts per email per 15 minutes.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  // Rate limit by IP as a broad guard
  const ip = getClientIp(req.headers);
  const ipRl = checkRateLimit(`forgot-ip:${ip}`, 10, 15 * 60);
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
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  // Rate limit per email: 3 attempts per 15 minutes
  const emailRl = checkRateLimit(`forgot-email:${email}`, 3, 15 * 60);
  if (!emailRl.success) {
    // Return success-looking response to prevent timing attacks, but still 429
    return NextResponse.json({ data: null, message: "If that email exists, a reset link has been sent." }, { status: 200 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond with success to prevent email enumeration
  if (!user) {
    return NextResponse.json(
      { data: null, message: "If that email exists, a reset link has been sent." },
      { status: 200 }
    );
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Generate a cryptographically secure token
  const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: rawToken,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({ to: email, resetUrl });

  return NextResponse.json(
    { data: null, message: "If that email exists, a reset link has been sent." },
    { status: 200 }
  );
}
