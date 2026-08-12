-- Security Phase 7 — tenant/storage boundary defense in depth.
-- This migration is NOT marked as applied to Production.
-- Apply first to Staging, run the A/B tenant isolation plan, then promote deliberately.
--
-- Goal: a row belonging to Business A must not be able to persist a Storage key
-- whose first path segment points at Business B. Storage RLS remains the primary
-- authorization boundary; these CHECK constraints bind database references to
-- the row's own business_id as an additional invariant.

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_logo_storage_key_business_prefix;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_logo_storage_key_business_prefix
  CHECK (
    logo_storage_key IS NULL
    OR logo_storage_key LIKE id::text || '/%'
  ) NOT VALID;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_attachment_storage_key_business_prefix;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_attachment_storage_key_business_prefix
  CHECK (
    attachment_storage_key IS NULL
    OR attachment_storage_key LIKE business_id::text || '/%'
  ) NOT VALID;

ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_pdf_storage_key_business_prefix;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_pdf_storage_key_business_prefix
  CHECK (
    pdf_storage_key IS NULL
    OR pdf_storage_key LIKE business_id::text || '/%'
  ) NOT VALID;

ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_cancellation_pdf_key_business_prefix;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_cancellation_pdf_key_business_prefix
  CHECK (
    cancellation_pdf_storage_key IS NULL
    OR cancellation_pdf_storage_key LIKE business_id::text || '/%'
  ) NOT VALID;

-- Staging promotion procedure after inspecting legacy rows:
-- ALTER TABLE public.businesses VALIDATE CONSTRAINT businesses_logo_storage_key_business_prefix;
-- ALTER TABLE public.expenses VALIDATE CONSTRAINT expenses_attachment_storage_key_business_prefix;
-- ALTER TABLE public.receipts VALIDATE CONSTRAINT receipts_pdf_storage_key_business_prefix;
-- ALTER TABLE public.receipts VALIDATE CONSTRAINT receipts_cancellation_pdf_key_business_prefix;
