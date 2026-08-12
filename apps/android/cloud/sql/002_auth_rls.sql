-- MK Receipt Pro Foundation 4
-- Supabase Auth + business membership + Row Level Security.
-- Run AFTER 001_shared_database.sql.

create table if not exists business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);

create index if not exists business_members_user_idx
  on business_members(user_id,business_id);

-- The original owner_user_id is linked to auth.users logically.
-- For existing empty test projects, insert the owner membership after signing in:
-- insert into business_members(business_id,user_id,role) values('<BUSINESS_UUID>',auth.uid(),'owner');

create or replace function user_has_business_access(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from business_members bm
    where bm.business_id=p_business_id
      and bm.user_id=(select auth.uid())
  );
$$;

revoke all on function user_has_business_access(uuid) from public;
grant execute on function user_has_business_access(uuid) to authenticated;

-- RLS
alter table businesses enable row level security;
alter table business_members enable row level security;
alter table devices enable row level security;
alter table customers enable row level security;
alter table expenses enable row level security;
alter table receipt_templates enable row level security;
alter table receipt_sequences enable row level security;
alter table receipt_number_reservations enable row level security;
alter table receipts enable row level security;
alter table sync_mutations enable row level security;

-- Business itself
drop policy if exists businesses_select_member on businesses;
create policy businesses_select_member
on businesses for select
to authenticated
using (user_has_business_access(id));

drop policy if exists businesses_update_admin on businesses;
create policy businesses_update_admin
on businesses for update
to authenticated
using (
  exists(
    select 1 from business_members bm
    where bm.business_id=businesses.id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','admin')
  )
)
with check (
  exists(
    select 1 from business_members bm
    where bm.business_id=businesses.id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','admin')
  )
);

-- Membership: members can see their own membership.
drop policy if exists business_members_select_self on business_members;
create policy business_members_select_self
on business_members for select
to authenticated
using (user_id=(select auth.uid()));

-- Shared tenant tables. No DELETE policy for receipts.
do $$
declare
  t text;
begin
  foreach t in array array['devices','customers','expenses','receipt_templates','receipt_sequences','receipt_number_reservations','receipts','sync_mutations']
  loop
    execute format('drop policy if exists %I_select_member on %I',t,t);
    execute format(
      'create policy %I_select_member on %I for select to authenticated using (user_has_business_access(business_id))',
      t,t
    );

    execute format('drop policy if exists %I_insert_member on %I',t,t);
    execute format(
      'create policy %I_insert_member on %I for insert to authenticated with check (user_has_business_access(business_id))',
      t,t
    );

    execute format('drop policy if exists %I_update_member on %I',t,t);
    execute format(
      'create policy %I_update_member on %I for update to authenticated using (user_has_business_access(business_id)) with check (user_has_business_access(business_id))',
      t,t
    );
  end loop;
end $$;

-- Customers/expenses/templates may be deleted/archived by members if needed.
drop policy if exists customers_delete_member on customers;
create policy customers_delete_member on customers for delete to authenticated
using (user_has_business_access(business_id));

drop policy if exists expenses_delete_member on expenses;
create policy expenses_delete_member on expenses for delete to authenticated
using (user_has_business_access(business_id));

drop policy if exists receipt_templates_delete_member on receipt_templates;
create policy receipt_templates_delete_member on receipt_templates for delete to authenticated
using (user_has_business_access(business_id));

-- Receipts intentionally have NO delete policy.

-- Protect number allocation RPCs: authenticated + membership required.
create or replace function reserve_receipt_number(
  p_business_id uuid,
  p_device_id uuid,
  p_ttl_minutes integer default 15
)
returns table(reservation_id uuid, receipt_number bigint, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
  v_reservation uuid;
  v_expires timestamptz;
begin
  if (select auth.uid()) is null or not user_has_business_access(p_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if not exists(
    select 1 from devices
    where id=p_device_id and business_id=p_business_id
  ) then
    raise exception 'DEVICE_NOT_REGISTERED';
  end if;

  insert into receipt_sequences(business_id,next_number,last_issued_number)
  values(p_business_id,1001,1000)
  on conflict (business_id) do nothing;

  select next_number into v_next
  from receipt_sequences
  where business_id=p_business_id
  for update;

  update receipt_sequences
  set next_number=v_next+1,updated_at=now()
  where business_id=p_business_id;

  v_reservation:=gen_random_uuid();
  v_expires:=now()+make_interval(mins=>greatest(1,least(p_ttl_minutes,30)));

  insert into receipt_number_reservations(
    id,business_id,device_id,receipt_number,status,expires_at
  ) values(v_reservation,p_business_id,p_device_id,v_next,'reserved',v_expires);

  return query select v_reservation,v_next,v_expires;
end;
$$;

revoke all on function reserve_receipt_number(uuid,uuid,integer) from public,anon;
grant execute on function reserve_receipt_number(uuid,uuid,integer) to authenticated;

create or replace function register_device(
  p_business_id uuid,
  p_device_key text,
  p_platform text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null or not user_has_business_access(p_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if p_platform not in ('windows','android') then
    raise exception 'INVALID_PLATFORM';
  end if;

  insert into devices(business_id,device_key,platform,display_name,last_seen_at)
  values(p_business_id,p_device_key,p_platform,p_display_name,now())
  on conflict(business_id,device_key)
  do update set last_seen_at=now(),display_name=excluded.display_name
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function register_device(uuid,text,text,text) from public,anon;
grant execute on function register_device(uuid,text,text,text) to authenticated;
