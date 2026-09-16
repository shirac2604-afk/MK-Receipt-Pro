-- The operator's own business is exempt from billing. Customer businesses remain trial/paid only.

create or replace function public.provision_my_business()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_business_id uuid;
  v_is_owner_free boolean := false;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select lower(coalesce(email,'')) = 'shirac2604@gmail.com'
    into v_is_owner_free
  from auth.users
  where id = v_user_id;

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
    v_business_id,
    case when coalesce(v_is_owner_free,false) then 'owner_free' else 'trial' end,
    case when coalesce(v_is_owner_free,false) then 'active' else 'trialing' end,
    now(),
    case when coalesce(v_is_owner_free,false) then null else now() + interval '14 days' end,
    now()
  );

  return v_business_id;
end;
$$;

-- Apply the exemption to the operator's existing owner business without relying on a generated ID.
insert into public.business_subscriptions (
  business_id, plan_key, status, starts_at, expires_at, grace_ends_at,
  suspended_at, suspension_reason, updated_at
)
select
  bm.business_id, 'owner_free', 'active', now(), null, null, null, null, now()
from auth.users u
join public.business_members bm on bm.user_id = u.id and bm.role = 'owner'
where lower(u.email) = 'shirac2604@gmail.com'
on conflict (business_id) do update
set plan_key = 'owner_free',
    status = 'active',
    expires_at = null,
    grace_ends_at = null,
    suspended_at = null,
    suspension_reason = null,
    updated_at = now();
