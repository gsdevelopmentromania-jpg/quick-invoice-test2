/**
 * Client Service
 *
 * Orchestrates client business logic by combining:
 *  - DAL operations (data access)
 *  - Plan/billing feature gates (client count limits)
 *
 * Route handlers should call these service functions instead of
 * touching the DAL directly.
 */

import { canCreateClient } from "@/lib/billing";
import { ApiError } from "@/lib/errors";
import {
  getClient,
  listClients,
  createClient as dalCreateClient,
  updateClient as dalUpdateClient,
  deleteClient as dalDeleteClient,
  type ListClientsOptions,
  type ClientPage,
} from "@/lib/dal/clients";
import type { Client } from "@prisma/client";
import type { CreateClientInput, UpdateClientInput } from "@/types";
import { Plan } from "@prisma/client";

// ─── Re-exports for consumers that only import from services ─────────────────

export type { ListClientsOptions, ClientPage };

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of clients for a user.
 */
export async function listUserClients(
  userId: string,
  options: ListClientsOptions = {}
): Promise<ClientPage> {
  return listClients(userId, options);
}

/**
 * Fetch a single client by ID.
 * Throws 404 if not found or not owned by userId.
 */
export async function getUserClient(
  userId: string,
  clientId: string
): Promise<Client> {
  const client = await getClient(userId, clientId);
  if (!client) {
    throw new ApiError("Client not found", 404);
  }
  return client;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateClientServiceInput extends CreateClientInput {
  /** Caller's plan, used to enforce feature gates */
  plan: Plan;
}

/**
 * Create a new client.
 * Enforces plan-based client count limits.
 * Throws 403 if the user has reached their limit.
 */
export async function createUserClient(
  userId: string,
  input: CreateClientServiceInput
): Promise<Client> {
  const { plan, ...clientInput } = input;

  const allowed = await canCreateClient(userId, plan);
  if (!allowed) {
    throw new ApiError(
      "You have reached your client limit. Upgrade to Pro for unlimited clients.",
      403
    );
  }

  return dalCreateClient(userId, clientInput);
}

/**
 * Partial-update an existing client.
 * Throws 404 if not found or not owned by userId.
 */
export async function updateUserClient(
  userId: string,
  clientId: string,
  input: UpdateClientInput
): Promise<Client> {
  const updated = await dalUpdateClient(userId, clientId, input);
  if (!updated) {
    throw new ApiError("Client not found", 404);
  }
  return updated;
}

/**
 * Delete a client.
 * Throws 404 if not found or not owned by userId.
 */
export async function deleteUserClient(
  userId: string,
  clientId: string
): Promise<void> {
  const deleted = await dalDeleteClient(userId, clientId);
  if (!deleted) {
    throw new ApiError("Client not found", 404);
  }
}
