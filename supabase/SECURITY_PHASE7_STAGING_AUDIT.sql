-- MK Receipt Pro — Security Phase 7 / Staging-only audit
-- READ-ONLY catalog and invariant checks. Do not use this as a substitute for
-- the real User A / Business A vs User B / Business B test with authenticated clients.
-- Run on a Development/Staging project, not as an automated Production mutation.

-- 1) Business tables that should have RLS enabled.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'businesses','business_members','customers','receipts','expenses',
    'devices','receipt_sequences','receipt_number_reservations'
  )
order by c.relname;

-- 2) Review effective public policies. Inspect USING and WITH CHECK separately.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

-- 3) SECURITY DEFINER functions: each exposed function requires explicit review
-- for auth.uid(), tenant authorization, fixed search_path and EXECUTE grants.
select n.nspname as schema_name,
       p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;

-- 4) Function grants. anon/PUBLIC must not execute sensitive SECURITY DEFINER RPCs.
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
order by routine_name, grantee;

-- 5) Storage buckets relevant to MK Receipt Pro.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('expense-attachments','business-branding','receipt-pdfs')
order by id;

-- 6) Detect database references whose Storage key does not belong to the row tenant.
-- Expected result for every query: zero rows.
select id, logo_storage_key
from public.businesses
where logo_storage_key is not null
  and logo_storage_key not like id::text || '/%';

select id, business_id, attachment_storage_key
from public.expenses
where attachment_storage_key is not null
  and attachment_storage_key not like business_id::text || '/%';

select id, business_id, pdf_storage_key, cancellation_pdf_storage_key
from public.receipts
where (pdf_storage_key is not null and pdf_storage_key not like business_id::text || '/%')
   or (cancellation_pdf_storage_key is not null and cancellation_pdf_storage_key not like business_id::text || '/%');

-- Manual authenticated Staging matrix still required:
-- A can CRUD A customers/receipts/expenses and cannot read/write B rows.
-- B can CRUD B rows and cannot read/write A rows.
-- Tampered business_id INSERT/UPDATE is rejected by WITH CHECK/RLS.
-- A cannot create/read/update/delete or sign B Storage objects.
-- A cannot consume/cancel B receipt reservations or revoke B devices.
-- Invalid/expired sessions cannot access either tenant.
