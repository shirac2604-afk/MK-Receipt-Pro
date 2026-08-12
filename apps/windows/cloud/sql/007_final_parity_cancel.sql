-- MK Receipt Pro Final Parity 1.1 - cloud receipt cancellation
-- Fixes PostgreSQL 42702 / ambiguous output-column names.
-- Safe to run again: CREATE OR REPLACE replaces the function in place.

create or replace function public.cancel_receipt_cloud(
  p_business_id uuid,
  p_receipt_id uuid,
  p_reason text
)
returns table(id uuid,status text,cancelled_at timestamptz,cancellation_reason text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_status text;
  v_cancelled_at timestamptz;
  v_reason text;
begin
  if (select auth.uid()) is null or not public.user_has_business_access(p_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if length(trim(coalesce(p_reason,''))) < 5 then
    raise exception 'INVALID_CANCELLATION_REASON';
  end if;

  select r.status, r.cancelled_at, r.cancellation_reason
    into v_status, v_cancelled_at, v_reason
  from public.receipts as r
  where r.id = p_receipt_id
    and r.business_id = p_business_id
  for update;

  if not found then
    raise exception 'RECEIPT_NOT_FOUND';
  end if;

  -- Idempotent: a repeated cancellation request returns the existing result.
  if v_status = 'cancelled' then
    return query
      select p_receipt_id, 'cancelled'::text, v_cancelled_at, v_reason;
    return;
  end if;

  v_cancelled_at := now();
  v_reason := trim(p_reason);

  update public.receipts as r
     set status = 'cancelled',
         cancellation_reason = v_reason,
         cancelled_at = v_cancelled_at,
         revision = r.revision + 1,
         updated_at = v_cancelled_at
   where r.id = p_receipt_id
     and r.business_id = p_business_id;

  return query
    select p_receipt_id, 'cancelled'::text, v_cancelled_at, v_reason;
end;
$$;

grant execute on function public.cancel_receipt_cloud(uuid,uuid,text) to authenticated;
