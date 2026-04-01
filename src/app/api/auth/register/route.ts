import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required").optional(),
});

/**
 * POST /api/auth/register
 *
 * Creates a new user account with email + hashed password.
 * Rate limited to 5 signups per IP per hour.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ email: string }>>> {
  // Rate limit: 5 signups per IP per hour
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`register:${ip}`, 5, 60 * 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { email, password, fullName } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      id: uuidv4(),
      email: normalizedEmail,
      passwordHash,
      fullName: fullName ?? null,
    },
  });

  return NextResponse.json(
    { data: { email: normalizedEmail }, message: "Account created successfully." },
    { status: 201 }
  );
}
