-- Applied to production on 2026-08-12.
-- Hardens receipt reservation consumption and preserves the public RPC signature used by clients.

CREATE OR REPLACE FUNCTION public.consume_receipt_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_business uuid;
  v_number bigint;
  v_status text;
  v_expires timestamptz;
begin
  select r.business_id, r.receipt_number, r.status, r.expires_at
    into v_business, v_number, v_status, v_expires
  from public.receipt_number_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND';
  end if;

  if (select auth.uid()) is null
     or not public.user_has_business_access(v_business) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if v_status <> 'reserved' then
    raise exception 'RESERVATION_NOT_ACTIVE';
  end if;

  if v_expires < now() then
    update public.receipt_number_reservations r
       set status = 'expired'
     where r.id = p_reservation_id;
    raise exception 'RESERVATION_EXPIRED';
  end if;

  update public.receipt_number_reservations r
     set status = 'consumed', consumed_at = now()
   where r.id = p_reservation_id;

  update public.receipt_sequences s
     set last_issued_number = greatest(s.last_issued_number, v_number),
         updated_at = now()
   where s.business_id = v_business;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_receipt_cloud(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_receipt_cloud(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_receipt_reservation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_receipt_reservation(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_business_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_business_access(uuid) TO authenticated;
