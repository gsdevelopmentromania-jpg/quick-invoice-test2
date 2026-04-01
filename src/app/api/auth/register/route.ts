import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { sendEmailVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  fullName: z.string().min(1, "Full name is required").max(100).optional(),
});

/**
 * POST /api/auth/register
 *
 * Creates a new user with hashed password and sends a verification email.
 * Rate-limited to 5 registrations per IP per hour.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ email: string }>>> {
  // Rate limit by IP
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`signup:${ip}`, 5, 60 * 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { email, password, fullName } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    // Return success to prevent user enumeration
    return NextResponse.json(
      {
        data: { email: normalizedEmail },
        message: "If this email is new, a verification link has been sent.",
      },
      { status: 201 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName: fullName ?? null,
    },
  });

  // Create email verification token (expires in 24 hours)
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token,
      expires,
    },
  });

  // Send verification email (fire-and-forget — don't block response)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verificationUrl = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

  sendEmailVerificationEmail({
    to: normalizedEmail,
    verificationUrl,
    name: user.fullName ?? undefined,
  }).catch((err: unknown) => {
    console.error("Failed to send verification email:", err);
  });

  return NextResponse.json(
    {
      data: { email: normalizedEmail },
      message: "Account created. Please check your email to verify.",
    },
    { status: 201 }
  );
}
