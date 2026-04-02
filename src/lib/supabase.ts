/**
 * Supabase Storage client
 *
 * Wraps the Supabase Storage REST API for server-side operations.
 * Uses the service-role key for privileged access (server only — never expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser).
 *
 * This module intentionally avoids the @supabase/supabase-js SDK so it has
 * zero additional runtime dependencies and compiles under the project's
 * strict ES2017 target.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Bucket name used for invoice PDF storage. */
export const PDF_BUCKET = "invoices";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StorageUploadResult {
  /** Publicly accessible URL of the uploaded file. */
  url: string;
  /** Storage path relative to the bucket root, e.g. "userId/invoiceId.pdf". */
  path: string;
}

export interface StorageDeleteResult {
  /** The path that was deleted. */
  path: string;
}

export interface StorageErrorBody {
  error: string;
  message: string;
  statusCode: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the canonical public URL for a storage object.
 * This URL is accessible without authentication if the bucket is public.
 */
export function getPublicUrl(path: string, bucket: string = PDF_BUCKET): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Derive the storage path from user and invoice IDs.
 * Format: `{userId}/{invoiceId}.pdf`
 */
export function buildPdfPath(userId: string, invoiceId: string): string {
  return `${userId}/${invoiceId}.pdf`;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload a PDF buffer to Supabase Storage.
 *
 * @param userId    - Owner's user ID (used as the top-level folder).
 * @param invoiceId - Invoice ID (used as the file name).
 * @param pdfBuffer - Raw PDF bytes.
 * @returns The public URL and storage path of the uploaded file.
 * @throws  If the upload fails or the environment is misconfigured.
 */
export async function uploadInvoicePDF(
  userId: string,
  invoiceId: string,
  pdfBuffer: Buffer
): Promise<StorageUploadResult> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase storage is not configured. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const path = buildPdfPath(userId, invoiceId);
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${PDF_BUCKET}/${path}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true", // overwrite if a PDF was previously generated
    },
    body: pdfBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Storage upload failed [${response.status}]: ${text}`);
  }

  return { url: getPublicUrl(path), path };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a PDF from Supabase Storage.
 *
 * Silently ignores 404 responses (file already removed).
 *
 * @param path - The storage path returned by {@link uploadInvoicePDF}.
 */
export async function deleteStorageObject(path: string): Promise<StorageDeleteResult> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase storage is not configured. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const endpoint = `${SUPABASE_URL}/storage/v1/object/${PDF_BUCKET}/${path}`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Storage delete failed [${response.status}]: ${text}`);
  }

  return { path };
}

/**
 * Convenience wrapper: delete a user's invoice PDF by IDs.
 */
export async function deleteInvoicePDF(
  userId: string,
  invoiceId: string
): Promise<StorageDeleteResult> {
  return deleteStorageObject(buildPdfPath(userId, invoiceId));
}
