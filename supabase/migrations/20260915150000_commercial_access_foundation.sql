-- Commercial access foundation: tenant subscriptions, trial access, and secure self-provisioning.
-- This migration preserves read access after expiry and blocks direct table writes.

create table if not exists public.business_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan_key text not null default 'trial',
  status text not null default 'trialing',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  grace_ends_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  updated_at timestamptz not null default now(),
  constraint business_subscriptions_status_check
    check (status in ('trialing','active','past_due','suspended','cancelled')),
  constraint business_subscriptions_plan_key_length
    check (char_length(btrim(plan_key)) between 2 and 64),
  constraint business_subscriptions_reason_length
    check (suspension_reason is null or char_length(suspension_reason) <= 500)
);

create index if not exists business_subscriptions_access_idx
  on public.business_subscriptions(status, expires_at, grace_ends_at);

alter table public.business_subscriptions enable row level security;

drop policy if exists business_subscriptions_select_member on public.business_subscriptions;
create policy business_subscriptions_select_member
  on public.business_subscriptions for select to authenticated
  using (public.user_has_business_access(business_id));

revoke all on public.business_subscriptions from anon, authenticated;
grant select on public.business_subscriptions to authenticated;

-- A missing subscription is never treated as paid access. Existing businesses are seeded below.
create or replace function public.user_has_business_write_access(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    join public.business_subscriptions bs on bs.business_id = bm.business_id
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
      and bs.status in ('trialing','active')
      and (bs.expires_at is null or bs.expires_at > now())
  );
$$;

revoke all on function public.user_has_business_write_access(uuid) from public;
grant execute on function public.user_has_business_write_access(uuid) to authenticated;

-- A new user receives an isolated business and a 14-day trial. The advisory lock makes this idempotent.
create or replace function public.provision_my_business()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_business_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select business_id into v_business_id
  from public.business_members
  where user_id = v_user_id
  order by business_id
  limit 1;

  if v_business_id is not null then
    return v_business_id;
  end if;

  insert into public.businesses (business_name)
  values ('העסק שלי')
  returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, v_user_id, 'owner');

  insert into public.business_subscriptions (
    business_id, plan_key, status, starts_at, expires_at, updated_at
  ) values (
    v_business_id, 'trial', 'trialing', now(), now() + interval '14 days', now()
  );

  return v_business_id;
end;
$$;

revoke all on function public.provision_my_business() from public;
grant execute on function public.provision_my_business() to authenticated;

-- Existing customers receive the same limited trial when this feature is enabled.
insert into public.business_subscriptions (
  business_id, plan_key, status, starts_at, expires_at, updated_at
)
select b.id, 'trial', 'trialing', now(), now() + interval '14 days', now()
from public.businesses b
on conflict (business_id) do nothing;

-- Existing direct table policies: allow members to read indefinitely, but permit writes only with an active subscription.
do $$
declare
  t text;
begin
  foreach t in array array[
    'students','student_guardians','student_groups','student_group_members',
    'lesson_series','lessons','lesson_participants','lesson_reminders'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_access', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.user_has_business_access(business_id))',
      t || '_select_member', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id))',
      t || '_insert_active', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id)) with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id))',
      t || '_update_active', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id))',
      t || '_delete_active', t
    );
  end loop;
end $$;

drop policy if exists customers_insert_member on public.customers;
drop policy if exists customers_update_member on public.customers;
drop policy if exists customers_delete_member on public.customers;
create policy customers_insert_active on public.customers for insert to authenticated
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));
create policy customers_update_active on public.customers for update to authenticated
  using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id))
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));
create policy customers_delete_active on public.customers for delete to authenticated
  using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));

drop policy if exists expenses_insert_member on public.expenses;
drop policy if exists expenses_update_member on public.expenses;
drop policy if exists expenses_delete_member on public.expenses;
create policy expenses_insert_active on public.expenses for insert to authenticated
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));
create policy expenses_update_active on public.expenses for update to authenticated
  using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id))
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));
create policy expenses_delete_active on public.expenses for delete to authenticated
  using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));

drop policy if exists receipt_templates_insert_member on public.receipt_templates;
drop policy if exists receipt_templates_update_member on public.receipt_templates;
drop policy if exists receipt_templates_delete_member on public.receipt_templates;
create policy receipt_templates_insert_active on public.receipt_templates for insert to authenticated
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));
create policy receipt_templates_update_active on public.receipt_templates for update to authenticated
  using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id))
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));
create policy receipt_templates_delete_active on public.receipt_templates for delete to authenticated
  using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));

drop policy if exists sync_mutations_insert_member on public.sync_mutations;
drop policy if exists sync_mutations_update_member on public.sync_mutations;
create policy sync_mutations_insert_active on public.sync_mutations for insert to authenticated
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));
create policy sync_mutations_update_active on public.sync_mutations for update to authenticated
  using (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id))
  with check (public.user_has_business_access(business_id) and public.user_has_business_write_access(business_id));

drop policy if exists businesses_update_admin on public.businesses;
create policy businesses_update_active_admin on public.businesses for update to authenticated
  using (
    public.user_has_business_write_access(id)
    and exists (
      select 1 from public.business_members bm
      where bm.business_id = businesses.id
        and bm.user_id = (select auth.uid())
        and bm.role in ('owner','admin')
    )
  )
  with check (
    public.user_has_business_write_access(id)
    and exists (
      select 1 from public.business_members bm
      where bm.business_id = businesses.id
        and bm.user_id = (select auth.uid())
        and bm.role in ('owner','admin')
    )
  );
