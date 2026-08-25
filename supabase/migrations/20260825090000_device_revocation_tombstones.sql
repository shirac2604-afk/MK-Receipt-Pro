-- Make remote device disconnection durable. A revoked device keeps a tombstone
-- so an already-running client cannot recreate the same device automatically.

alter table public.devices
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid;

create index if not exists devices_business_active_idx
  on public.devices(business_id,last_seen_at desc)
  where revoked_at is null;

-- Device rows must only be mutated through the guarded RPCs below. Without
-- this restriction, a regular member could clear its own revoked_at value.
drop policy if exists devices_insert_member on public.devices;
drop policy if exists devices_update_member on public.devices;
revoke insert, update, delete on table public.devices from public, anon, authenticated;

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

  if p_platform not in ('windows','android') then
    raise exception 'INVALID_PLATFORM';
  end if;

  insert into public.devices(
    business_id,device_key,platform,display_name,last_seen_at,revoked_at,revoked_by
  ) values(
    p_business_id,p_device_key,p_platform,p_display_name,now(),null,null
  )
  on conflict(business_id,device_key)
  do update set
    last_seen_at=now(),
    display_name=excluded.display_name
  where public.devices.revoked_at is null
  returning id into v_id;

  if v_id is null then
    raise exception 'DEVICE_REVOKED';
  end if;

  return v_id;
end;
$function$;

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
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.business_members bm
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

  update public.devices target_device
  set revoked_at=now(),revoked_by=(select auth.uid())
  where target_device.id=p_device_id
    and target_device.business_id=p_business_id
    and target_device.revoked_at is null;

  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;
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

  if not exists (
    select 1 from public.devices d
    where d.id=p_device_id
      and d.business_id=p_business_id
      and d.revoked_at is null
  ) then
    raise exception 'DEVICE_NOT_REGISTERED';
  end if;

  insert into public.receipt_sequences(business_id,next_number,last_issued_number)
  values(p_business_id,1001,1000)
  on conflict (business_id) do nothing;

  select next_number into v_next
  from public.receipt_sequences
  where business_id=p_business_id
  for update;

  update public.receipt_sequences
  set next_number=v_next+1,updated_at=now()
  where business_id=p_business_id;

  v_reservation:=gen_random_uuid();
  v_expires:=now()+make_interval(mins=>greatest(1,least(p_ttl_minutes,30)));

  insert into public.receipt_number_reservations(
    id,business_id,device_id,receipt_number,status,expires_at
  ) values(v_reservation,p_business_id,p_device_id,v_next,'reserved',v_expires);

  return query select v_reservation,v_next,v_expires;
end;
$function$;

revoke all on function public.register_device(uuid,text,text,text) from public, anon;
grant execute on function public.register_device(uuid,text,text,text) to authenticated;
revoke all on function public.revoke_device(uuid,uuid,uuid) from public, anon;
grant execute on function public.revoke_device(uuid,uuid,uuid) to authenticated;
revoke all on function public.reserve_receipt_number(uuid,uuid,integer) from public, anon;
grant execute on function public.reserve_receipt_number(uuid,uuid,integer) to authenticated;
