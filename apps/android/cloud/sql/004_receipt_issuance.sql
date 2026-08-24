-- MK Receipt Pro Foundation 7.2
-- Fixes PostgreSQL 42702 ambiguous-column errors in receipt issuance.
-- Safe to run again: CREATE OR REPLACE FUNCTION + policy recreation.

create or replace function issue_receipt_from_reservation(
  p_business_id uuid,
  p_device_id uuid,
  p_reservation_id uuid,
  p_payment_date date,
  p_customer_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_description text,
  p_amount_agorot bigint,
  p_payment_method text,
  p_reference_number text
)
returns table(
  id uuid,
  receipt_number bigint,
  issued_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_number bigint;
  v_status text;
  v_expires timestamptz;
  v_res_business uuid;
  v_res_device uuid;
  v_receipt_id uuid;
  v_issued_at timestamptz;
  v_hash text;
begin
  if (select auth.uid()) is null
     or not user_has_business_access(p_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if p_amount_agorot <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if length(trim(coalesce(p_client_name,''))) = 0 then
    raise exception 'CLIENT_NAME_REQUIRED';
  end if;

  if length(trim(coalesce(p_description,''))) = 0 then
    raise exception 'DESCRIPTION_REQUIRED';
  end if;

  if p_payment_method not in ('cash','bank_transfer','bit','paybox') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_customer_id is not null
     and not exists(
       select 1
       from customers c
       where c.id = p_customer_id
         and c.business_id = p_business_id
     ) then
    raise exception 'CUSTOMER_NOT_IN_BUSINESS';
  end if;

  select
    r.business_id,
    r.device_id,
    r.receipt_number,
    r.status,
    r.expires_at
  into
    v_res_business,
    v_res_device,
    v_number,
    v_status,
    v_expires
  from receipt_number_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND';
  end if;

  if v_res_business <> p_business_id
     or v_res_device <> p_device_id then
    raise exception 'RESERVATION_OWNERSHIP_MISMATCH';
  end if;

  if v_status <> 'reserved' then
    raise exception 'RESERVATION_NOT_ACTIVE';
  end if;

  if v_expires < now() then
    update receipt_number_reservations r
      set status='expired'
    where r.id=p_reservation_id;
    raise exception 'RESERVATION_EXPIRED';
  end if;

  v_receipt_id := gen_random_uuid();
  v_issued_at := now();

  v_hash := encode(
    digest(
      concat_ws(
        '|',
        p_business_id::text,
        v_number::text,
        p_payment_date::text,
        trim(p_client_name),
        trim(p_description),
        p_amount_agorot::text,
        p_payment_method,
        coalesce(trim(p_reference_number),'')
      ),
      'sha256'
    ),
    'hex'
  );

  insert into receipts(
    id,
    business_id,
    reservation_id,
    receipt_number,
    payment_date,
    issued_at,
    customer_id,
    client_name,
    client_phone,
    client_email,
    description,
    amount_agorot,
    payment_method,
    reference_number,
    status,
    content_hash
  )
  values(
    v_receipt_id,
    p_business_id,
    p_reservation_id,
    v_number,
    p_payment_date,
    v_issued_at,
    p_customer_id,
    trim(p_client_name),
    nullif(trim(p_client_phone),''),
    nullif(trim(p_client_email),''),
    trim(p_description),
    p_amount_agorot,
    p_payment_method,
    nullif(trim(p_reference_number),''),
    'active',
    v_hash
  );

  update receipt_number_reservations r
    set status='consumed',
        consumed_at=v_issued_at
  where r.id=p_reservation_id;

  update receipt_sequences s
    set last_issued_number=greatest(s.last_issued_number,v_number),
        updated_at=v_issued_at
  where s.business_id=p_business_id;

  return query
    select
      v_receipt_id::uuid,
      v_number::bigint,
      v_issued_at::timestamptz,
      'active'::text;
end;
$$;

revoke all on function issue_receipt_from_reservation(
  uuid,uuid,uuid,date,uuid,text,text,text,text,bigint,text,text
) from public,anon;

grant execute on function issue_receipt_from_reservation(
  uuid,uuid,uuid,date,uuid,text,text,text,text,bigint,text,text
) to authenticated;

-- Receipt PDFs may be linked only after an authorized user uploaded the
-- expected object for that exact business and receipt.
create or replace function public.link_receipt_pdf_storage_key(
  p_business_id uuid,
  p_receipt_id uuid,
  p_pdf_storage_key text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
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
$$;

revoke all on function public.link_receipt_pdf_storage_key(uuid, uuid, text) from public, anon;
grant execute on function public.link_receipt_pdf_storage_key(uuid, uuid, text) to authenticated;

-- Storage policies remain idempotent.
drop policy if exists mk_receipt_documents_select on storage.objects;
create policy mk_receipt_documents_select
on storage.objects for select to authenticated
using (
  bucket_id='receipt-documents'
  and array_length(storage.foldername(name),1)>=2
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists mk_receipt_documents_insert on storage.objects;
create policy mk_receipt_documents_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='receipt-documents'
  and array_length(storage.foldername(name),1)>=2
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists mk_receipt_documents_update on storage.objects;
create policy mk_receipt_documents_update
on storage.objects for update to authenticated
using (
  bucket_id='receipt-documents'
  and array_length(storage.foldername(name),1)>=2
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id='receipt-documents'
  and array_length(storage.foldername(name),1)>=2
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);
