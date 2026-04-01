import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const deleteSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  password: z.string().optional(),
});

/**
 * DELETE /api/user/delete
 *
 * GDPR-compliant account deletion.
 * - Requires typed confirmation phrase.
 * - Password-based users must also provide their current password.
 * - Cascades: all clients, invoices, subscriptions deleted via DB constraints.
 * - Returns 200 with a message so the client can sign out cleanly.
 */
export async function DELETE(
  req: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please type "DELETE MY ACCOUNT" to confirm.' },
      { status: 400 }
    );
  }

  const { password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Password-based accounts must verify password before deletion
  if (user.passwordHash) {
    if (!password) {
      return NextResponse.json(
        { error: "Please enter your current password to confirm account deletion." },
        { status: 400 }
      );
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password. Account deletion cancelled." },
        { status: 400 }
      );
    }
  }

  // Delete user record — cascades to all related data via DB foreign keys
  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json(
    { data: null, message: "Your account has been permanently deleted." },
    { status: 200 }
  );
}
