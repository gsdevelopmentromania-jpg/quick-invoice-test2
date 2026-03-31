import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const registerSchema = z.object({
  id: z.string().uuid("Must be a valid Supabase auth.users UUID"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required").optional(),
});

/**
 * POST /api/auth/register
 *
 * Creates a User profile record after Supabase Auth signup.
 * Called server-side after `supabase.auth.signUp()` succeeds.
 *
 * The `id` must match the UUID from Supabase auth.users.
 * Password management is handled entirely by Supabase Auth.
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ email: string }>>> {
  const body: unknown = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { id, email, fullName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A profile for this email already exists" },
      { status: 409 }
    );
  }

  await prisma.user.create({
    data: { id, email, fullName },
  });

  return NextResponse.json(
    { data: { email }, message: "Profile created successfully" },
    { status: 201 }
  );
}
