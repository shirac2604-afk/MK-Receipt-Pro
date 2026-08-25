-- Follow-up hardening for durable device revocation.
-- Preserves the reservation locking and cancellation guarantees introduced by
-- 20260825080000 while retaining the tombstone permissions from 0900.

create or replace function public.revoke_device(
  p_business_id uuid,
  p_device_id uuid,
  p_current_device_id uuid default null::uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_revoked_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.business_members bm
    where bm.business_id=p_business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','admin')
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_current_device_id is null or not exists (
    select 1 from public.devices current_device
    where current_device.id=p_current_device_id
      and current_device.business_id=p_business_id
      and current_device.revoked_at is null
  ) then
    raise exception 'CURRENT_DEVICE_NOT_ACTIVE';
  end if;

  if p_device_id=p_current_device_id then
    raise exception 'CANNOT_REVOKE_CURRENT_DEVICE';
  end if;

  select target_device.revoked_at
    into v_revoked_at
  from public.devices target_device
  where target_device.id=p_device_id
    and target_device.business_id=p_business_id
  for update;

  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  if v_revoked_at is not null then
    return;
  end if;

  update public.devices target_device
  set revoked_at=now(),revoked_by=(select auth.uid())
  where target_device.id=p_device_id
    and target_device.business_id=p_business_id;

  update public.receipt_number_reservations reservation
  set status='cancelled'
  where reservation.business_id=p_business_id
    and reservation.device_id=p_device_id
    and reservation.status='reserved';
end;
$function$;

create or replace function public.reserve_receipt_number(
  p_business_id uuid,
  p_device_id uuid,
  p_ttl_minutes integer default 15
)
returns table(reservation_id uuid, receipt_number bigint, expires_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_next bigint;
  v_reservation uuid;
  v_expires timestamptz;
begin
  if (select auth.uid()) is null or not public.user_has_business_access(p_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  perform 1
  from public.devices device
  where device.id=p_device_id
    and device.business_id=p_business_id
    and device.revoked_at is null
  for key share;

  if not found then
    raise exception 'DEVICE_REVOKED_OR_NOT_REGISTERED';
  end if;

  insert into public.receipt_sequences(business_id,next_number,last_issued_number)
  values(p_business_id,1001,1000)
  on conflict (business_id) do nothing;

  select sequence.next_number into v_next
  from public.receipt_sequences sequence
  where sequence.business_id=p_business_id
  for update;

  update public.receipt_sequences sequence
  set next_number=v_next+1,updated_at=now()
  where sequence.business_id=p_business_id;

  v_reservation:=gen_random_uuid();
  v_expires:=now()+make_interval(mins=>greatest(1,least(p_ttl_minutes,30)));

  insert into public.receipt_number_reservations(
    id,business_id,device_id,receipt_number,status,expires_at
  ) values(v_reservation,p_business_id,p_device_id,v_next,'reserved',v_expires);

  return query select v_reservation,v_next,v_expires;
end;
$function$;

revoke all on function public.revoke_device(uuid,uuid,uuid) from public, anon;
grant execute on function public.revoke_device(uuid,uuid,uuid) to authenticated;
revoke all on function public.reserve_receipt_number(uuid,uuid,integer) from public, anon;
grant execute on function public.reserve_receipt_number(uuid,uuid,integer) to authenticated;
