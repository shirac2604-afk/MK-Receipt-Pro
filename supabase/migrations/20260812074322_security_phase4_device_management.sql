-- Applied to production on 2026-08-12.
-- Restricts business profile updates to owner/admin and adds an authorized device-revocation RPC.

DROP POLICY IF EXISTS "business profile update" ON public.businesses;

-- Keep the existing businesses_update_admin policy as the only UPDATE policy.

CREATE OR REPLACE FUNCTION public.revoke_device(
  p_business_id uuid,
  p_device_id uuid,
  p_current_device_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin')
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_current_device_id is not null and p_device_id = p_current_device_id then
    raise exception 'CANNOT_REVOKE_CURRENT_DEVICE';
  end if;

  if not exists (
    select 1 from public.devices d
    where d.id = p_device_id and d.business_id = p_business_id
  ) then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  delete from public.devices d
  where d.id = p_device_id and d.business_id = p_business_id;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.revoke_device(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_device(uuid, uuid, uuid) TO authenticated;
