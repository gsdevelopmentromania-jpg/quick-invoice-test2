/**
 * User Data Access Layer
 */

import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import type { UpdateProfileInput } from "@/types";

/**
 * Fetch a user's full profile by ID.
 * Returns null if no user exists with that ID.
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id: userId } });
}

/**
 * Partial-update a user's profile fields.
 * Throws if no user exists with that ID (Prisma will throw P2025).
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: input });
}
