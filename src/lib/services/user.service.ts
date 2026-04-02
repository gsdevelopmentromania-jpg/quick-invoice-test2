/**
 * User Service
 *
 * Orchestrates user profile business logic.
 * Keeps password change, account deletion, and profile update
 * concerns separate from route handlers.
 */

import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import {
  getUserProfile,
  updateUserProfile,
} from "@/lib/dal/users";
import type { User } from "@prisma/client";
import type { UpdateProfileInput } from "@/types";

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { UpdateProfileInput };

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a user's full profile.
 * Throws 404 if no user exists with the given ID.
 */
export async function getProfile(userId: string): Promise<User> {
  const user = await getUserProfile(userId);
  if (!user) {
    throw new ApiError("User not found", 404);
  }
  return user;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Update a user's profile fields.
 * Throws 404 if no user exists with the given ID.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<User> {
  const existing = await getUserProfile(userId);
  if (!existing) {
    throw new ApiError("User not found", 404);
  }
  return updateUserProfile(userId, input);
}

/**
 * Change a user's password.
 * Verifies that the current password matches before hashing and saving the new one.
 * Throws 400 if the current password is incorrect.
 * Throws 404 if the user is not found.
 *
 * Note: this application stores bcrypt hashes in the `passwordHash` column,
 * but the Prisma schema may call it something else — adjust if needed.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const bcrypt = await import("bcryptjs");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (!user.passwordHash) {
    // OAuth-only account — no password to change
    throw new ApiError(
      "This account uses social login and does not have a password.",
      400
    );
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new ApiError("Current password is incorrect", 400);
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

/**
 * Permanently delete a user account and all associated data.
 * Cascades are handled at the database level (see prisma/schema.prisma).
 * Throws 404 if no user exists with the given ID.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const existing = await getUserProfile(userId);
  if (!existing) {
    throw new ApiError("User not found", 404);
  }
  await prisma.user.delete({ where: { id: userId } });
}
