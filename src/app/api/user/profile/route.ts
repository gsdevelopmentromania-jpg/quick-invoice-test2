import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, UserSafe } from "@/types";

const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

/**
 * GET /api/v1/profile
 * Returns the current user's profile.
 */
export async function GET(
  _req: NextRequest
): Promise<NextResponse<ApiResponse<UserSafe>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

/**
 * PATCH /api/v1/profile
 * Updates the current user's profile settings.
 */
export async function PATCH(
  req: NextRequest
): Promise<NextResponse<ApiResponse<UserSafe>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}
