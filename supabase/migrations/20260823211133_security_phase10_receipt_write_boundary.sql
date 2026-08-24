-- Security Phase 10 — receipt financial integrity boundary.
-- Tested on the MK Receipt Pro staging project before production promotion.

begin;

drop policy if exists receipts_insert_member on public.receipts;
drop policy if exists receipts_update_member on public.receipts;
drop policy if exists receipt_sequences_insert_member on public.receipt_sequences;
drop policy if exists receipt_sequences_update_member on public.receipt_sequences;
drop policy if exists receipt_number_reservations_insert_member on public.receipt_number_reservations;
drop policy if exists receipt_number_reservations_update_member on public.receipt_number_reservations;

revoke insert, update, delete on table public.receipts from anon, authenticated;
revoke insert, update, delete on table public.receipt_sequences from anon, authenticated;
revoke insert, update, delete on table public.receipt_number_reservations from anon, authenticated;

create or replace function public.link_receipt_pdf_storage_key(
  p_business_id uuid,
  p_receipt_id uuid,
  p_pdf_storage_key text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  if (select auth.uid()) is null
     or not public.user_has_business_access(p_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if p_pdf_storage_key is null
     or char_length(p_pdf_storage_key) > 1024
     or p_pdf_storage_key !~ (
       '^' || p_business_id::text || '/' || p_receipt_id::text ||
       '/([0-9]+-)?receipt-[0-9]+[.]pdf$'
     ) then
    raise exception 'INVALID_RECEIPT_PDF_STORAGE_KEY';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'receipt-documents'
      and o.name = p_pdf_storage_key
  ) then
    raise exception 'RECEIPT_PDF_OBJECT_NOT_FOUND';
  end if;

  update public.receipts r
     set pdf_storage_key = p_pdf_storage_key,
         updated_at = now()
   where r.id = p_receipt_id
     and r.business_id = p_business_id
     and r.status = 'active';

  if not found then
    raise exception 'RECEIPT_NOT_ACTIVE_OR_NOT_FOUND';
  end if;
end;
$function$;

revoke all on function public.link_receipt_pdf_storage_key(uuid, uuid, text) from public, anon;
grant execute on function public.link_receipt_pdf_storage_key(uuid, uuid, text) to authenticated;

commit;
