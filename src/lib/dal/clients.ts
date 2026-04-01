/**
 * Client Data Access Layer
 *
 * All queries are scoped to the owning userId — never expose cross-user data.
 */

import prisma from "@/lib/prisma";
import type { Client } from "@prisma/client";
import type { CreateClientInput, UpdateClientInput, PaginatedResponse } from "@/types";

export interface ListClientsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ClientPage = PaginatedResponse<Client> & {
  pageSize: number;
  totalPages: number;
};

/**
 * Fetch a single client owned by the given user.
 * Returns null if not found or owned by a different user.
 */
export async function getClient(
  userId: string,
  clientId: string
): Promise<Client | null> {
  return prisma.client.findFirst({ where: { id: clientId, userId } });
}

/**
 * Paginated list of clients, with optional name / email / company full-text search.
 */
export async function listClients(
  userId: string,
  options: ListClientsOptions = {}
): Promise<ClientPage> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const { search } = options;

  const where = {
    userId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return {
    data: clients,
    total,
    page,
    limit: pageSize,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Create a new client for a user.
 */
export async function createClient(
  userId: string,
  input: CreateClientInput
): Promise<Client> {
  return prisma.client.create({ data: { ...input, userId } });
}

/**
 * Partial-update a client. Returns null if the record does not belong to userId.
 */
export async function updateClient(
  userId: string,
  clientId: string,
  input: UpdateClientInput
): Promise<Client | null> {
  const existing = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!existing) return null;
  return prisma.client.update({ where: { id: clientId }, data: input });
}

/**
 * Delete a client. Returns false if not found / not owned by userId.
 */
export async function deleteClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const existing = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!existing) return false;
  await prisma.client.delete({ where: { id: clientId } });
  return true;
}
