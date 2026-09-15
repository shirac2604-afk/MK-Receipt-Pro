-- Enforce subscription write access inside receipt/device write paths.
-- This also applies to SECURITY DEFINER receipt RPCs, which bypass table RLS.

create or replace function public.enforce_business_subscription_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_business_id uuid;
  v_jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  -- Administrative server work may use the service role; browser and mobile requests may not.
  if v_jwt_role = 'service_role' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_business_id := case when tg_op = 'DELETE' then old.business_id else new.business_id end;

  if (select auth.uid()) is null
     or not public.user_has_business_write_access(v_business_id) then
    raise exception 'SUBSCRIPTION_WRITE_ACCESS_REQUIRED';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.enforce_business_subscription_write() from public;

drop trigger if exists receipts_subscription_write_guard on public.receipts;
create trigger receipts_subscription_write_guard
before insert or update or delete on public.receipts
for each row execute function public.enforce_business_subscription_write();

drop trigger if exists receipt_reservations_subscription_write_guard on public.receipt_number_reservations;
create trigger receipt_reservations_subscription_write_guard
before insert or update or delete on public.receipt_number_reservations
for each row execute function public.enforce_business_subscription_write();

drop trigger if exists receipt_sequences_subscription_write_guard on public.receipt_sequences;
create trigger receipt_sequences_subscription_write_guard
before insert or update or delete on public.receipt_sequences
for each row execute function public.enforce_business_subscription_write();

drop trigger if exists devices_subscription_write_guard on public.devices;
create trigger devices_subscription_write_guard
before insert or update or delete on public.devices
for each row execute function public.enforce_business_subscription_write();
