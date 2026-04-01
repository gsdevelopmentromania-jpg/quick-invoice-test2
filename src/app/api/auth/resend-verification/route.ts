import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmailVerificationEmail } from "@/lib/email";
import type { ApiResponse } from "@/types";

const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/resend-verification
 *
 * Issues a fresh verification email for unverified accounts.
 * Always returns 200 to prevent user enumeration.
 * Rate limited to 3 requests per IP per hour and 3 per email per hour.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ sent: boolean }>>> {
  const ip = getClientIp(req.headers);
  const ipRl = checkRateLimit(`resend-verification:${ip}`, 3, 60 * 60);
  if (!ipRl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await req.json();
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  // Per-email rate limit — still return 200 to prevent enumeration
  const emailRl = checkRateLimit(`resend-verification-email:${email}`, 3, 60 * 60);
  if (!emailRl.success) {
    return NextResponse.json({ data: { sent: true } }, { status: 200 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal whether the account exists or is already verified
  if (!user || user.emailVerified) {
    return NextResponse.json({ data: { sent: true } }, { status: 200 });
  }

  // Replace any existing verification tokens for this address
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  sendEmailVerificationEmail({
    to: email,
    verificationUrl,
    name: user.fullName ?? undefined,
  }).catch((err: unknown) => {
    console.error("Failed to send verification email:", err);
  });

  return NextResponse.json({ data: { sent: true } }, { status: 200 });
}
