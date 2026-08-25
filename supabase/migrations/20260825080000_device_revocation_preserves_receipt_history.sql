-- Device revocation must preserve accounting records.
-- A receipt reservation can be referenced by an issued receipt, so deleting a
-- device would cascade to a reservation and violate receipts.reservation_id.

alter table public.devices
  add column if not exists revoked_at timestamptz;

create index if not exists devices_active_business_last_seen_idx
  on public.devices (business_id, last_seen_at desc)
  where revoked_at is null;

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
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner', 'admin')
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_current_device_id is not null and p_device_id = p_current_device_id then
    raise exception 'CANNOT_REVOKE_CURRENT_DEVICE';
  end if;

  select d.revoked_at
    into v_revoked_at
  from public.devices d
  where d.id = p_device_id
    and d.business_id = p_business_id
  for update;

  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  -- Idempotent: a second request cannot delete any accounting history.
  if v_revoked_at is not null then
    return;
  end if;

  update public.devices d
     set revoked_at = now()
   where d.id = p_device_id
     and d.business_id = p_business_id;

  -- A pending number from a revoked device must not be issued later. Consumed
  -- reservations remain untouched because they are part of the receipt audit trail.
  update public.receipt_number_reservations r
     set status = 'cancelled'
   where r.business_id = p_business_id
     and r.device_id = p_device_id
     and r.status = 'reserved';
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

  -- Shares a lock with revoke_device so a revocation cannot race a new number
  -- reservation. A revoked device cannot reserve future receipt numbers.
  perform 1
  from public.devices d
  where d.id = p_device_id
    and d.business_id = p_business_id
    and d.revoked_at is null
  for key share;

  if not found then
    raise exception 'DEVICE_REVOKED_OR_NOT_REGISTERED';
  end if;

  insert into public.receipt_sequences(business_id, next_number, last_issued_number)
  values (p_business_id, 1001, 1000)
  on conflict (business_id) do nothing;

  select s.next_number
    into v_next
  from public.receipt_sequences s
  where s.business_id = p_business_id
  for update;

  update public.receipt_sequences s
     set next_number = v_next + 1,
         updated_at = now()
   where s.business_id = p_business_id;

  v_reservation := gen_random_uuid();
  v_expires := now() + make_interval(mins => greatest(1, least(p_ttl_minutes, 30)));

  insert into public.receipt_number_reservations(
    id, business_id, device_id, receipt_number, status, expires_at
  ) values (
    v_reservation, p_business_id, p_device_id, v_next, 'reserved', v_expires
  );

  return query select v_reservation, v_next, v_expires;
end;
$function$;

create or replace function public.register_device(
  p_business_id uuid,
  p_device_key text,
  p_platform text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null or not public.user_has_business_access(p_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if p_platform not in ('windows', 'android') then
    raise exception 'INVALID_PLATFORM';
  end if;

  insert into public.devices(business_id, device_key, platform, display_name, last_seen_at)
  values (p_business_id, p_device_key, p_platform, p_display_name, now())
  on conflict (business_id, device_key)
  do update set
    last_seen_at = now(),
    display_name = excluded.display_name
  where public.devices.revoked_at is null
  returning id into v_id;

  if v_id is null then
    if exists (
      select 1
      from public.devices d
      where d.business_id = p_business_id
        and d.device_key = p_device_key
        and d.revoked_at is not null
    ) then
      raise exception 'DEVICE_REVOKED';
    end if;

    raise exception 'DEVICE_REGISTRATION_FAILED';
  end if;

  return v_id;
end;
$function$;

revoke all on function public.revoke_device(uuid, uuid, uuid) from public, anon;
grant execute on function public.revoke_device(uuid, uuid, uuid) to authenticated;
revoke all on function public.reserve_receipt_number(uuid, uuid, integer) from public, anon;
grant execute on function public.reserve_receipt_number(uuid, uuid, integer) to authenticated;
revoke all on function public.register_device(uuid, text, text, text) from public, anon;
grant execute on function public.register_device(uuid, text, text, text) to authenticated;
