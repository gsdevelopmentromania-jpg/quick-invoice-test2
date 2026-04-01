import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const resetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
});

/**
 * POST /api/auth/reset-password
 *
 * Verifies the reset token and updates the user's password.
 * Rate-limited to 10 attempts per IP per hour.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ reset: boolean }>>> {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`reset-pw:${ip}`, 10, 60 * 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await req.json();
  const parsed = resetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  if (resetToken.usedAt !== null) {
    return NextResponse.json(
      { error: "This reset link has already been used" },
      { status: 400 }
    );
  }

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link has expired" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ data: { reset: true } }, { status: 200 });
}
