import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";
import type { User } from "@prisma/client";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  vatNumber: z.string().optional(),
  currency: z.string().length(3).optional(),
  logoUrl: z.string().url().optional(),
});

type SafeUser = Omit<User, "passwordHash">;

/**
 * GET /api/user/profile
 * Returns the current user's profile (without passwordHash).
 */
export async function GET(
  _req: NextRequest
): Promise<NextResponse<ApiResponse<SafeUser>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    omit: { passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

/**
 * PATCH /api/user/profile
 * Updates the current user's profile settings.
 */
export async function PATCH(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SafeUser>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    omit: { passwordHash: true },
  });

  return NextResponse.json({ data: updated });
}
