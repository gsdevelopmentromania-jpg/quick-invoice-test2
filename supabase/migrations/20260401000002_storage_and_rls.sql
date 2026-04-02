-- =============================================================================
-- Quick Invoice — Supabase Storage & Row-Level Security Setup
-- =============================================================================
-- Creates the "invoices" storage bucket for PDF files and applies
-- Row-Level Security (RLS) policies so that:
--   • Authenticated users can only read their own PDFs.
--   • Only the service role (server-side API) can write/delete files.
--   • Public read is enabled for sharing invoice PDFs with clients.
-- =============================================================================

-- ─── Storage bucket ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices',
    'invoices',
    TRUE,                        -- public: files are accessible via public URL
    10485760,                    -- 10 MB per file
    ARRAY['application/pdf']     -- only PDFs are allowed
)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS: storage.objects ─────────────────────────────────────────────────────
-- Supabase Storage enforces object-level access via policies on storage.objects.

-- Enable RLS on the storage objects table (enabled by default in Supabase).
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read their own PDFs.
-- Path format: {userId}/{invoiceId}.pdf
CREATE POLICY "Users can read own invoice PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'invoices'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Service role (server API) can upload PDFs on behalf of any user.
CREATE POLICY "Service role can upload invoice PDFs"
    ON storage.objects
    FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'invoices');

-- Policy: Service role can update (upsert) PDFs.
CREATE POLICY "Service role can update invoice PDFs"
    ON storage.objects
    FOR UPDATE
    TO service_role
    USING (bucket_id = 'invoices');

-- Policy: Service role can delete PDFs.
CREATE POLICY "Service role can delete invoice PDFs"
    ON storage.objects
    FOR DELETE
    TO service_role
    USING (bucket_id = 'invoices');

-- ─── Helper: auto-update updatedAt columns ────────────────────────────────────
-- Supabase does not execute Prisma's @updatedAt hooks directly; this trigger
-- replicates that behaviour at the database level for tables that have an
-- "updatedAt" column.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON "clients"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON "invoices"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON "subscriptions"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
