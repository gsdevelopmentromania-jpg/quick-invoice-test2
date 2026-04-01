import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const querySchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

/**
 * GET /api/auth/verify-email?token=xxx&email=user@example.com
 *
 * Verifies the email address by checking the token in verification_tokens.
 * Sets emailVerified on the user and deletes the token.
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ verified: boolean }>>> {
  const { searchParams } = req.nextUrl;
  const parsed = querySchema.safeParse({
    token: searchParams.get("token"),
    email: searchParams.get("email"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification link" }, { status: 400 });
  }

  const { token, email } = parsed.data;

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.identifier !== email.toLowerCase()) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "Verification link has expired" }, { status: 400 });
  }

  // Mark email as verified and delete the token
  await prisma.$transaction([
    prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ data: { verified: true } }, { status: 200 });
}
