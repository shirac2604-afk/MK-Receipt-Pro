-- Production-readiness hardening: financial SECURITY DEFINER RPCs must never be callable anonymously.
-- Signed-in application users retain EXECUTE; each function also performs its existing tenant/device checks.

revoke execute on function public.cancel_receipt_cloud(uuid,uuid,text) from public;
revoke execute on function public.cancel_receipt_cloud(uuid,uuid,text) from anon;
grant execute on function public.cancel_receipt_cloud(uuid,uuid,text) to authenticated;

revoke execute on function public.consume_receipt_reservation(uuid) from public;
revoke execute on function public.consume_receipt_reservation(uuid) from anon;
grant execute on function public.consume_receipt_reservation(uuid) to authenticated;

revoke execute on function public.issue_receipt_from_reservation(uuid,uuid,uuid,date,uuid,text,text,text,text,bigint,text,text) from public;
revoke execute on function public.issue_receipt_from_reservation(uuid,uuid,uuid,date,uuid,text,text,text,text,bigint,text,text) from anon;
grant execute on function public.issue_receipt_from_reservation(uuid,uuid,uuid,date,uuid,text,text,text,text,bigint,text,text) to authenticated;

revoke execute on function public.register_device(uuid,text,text,text) from public;
revoke execute on function public.register_device(uuid,text,text,text) from anon;
grant execute on function public.register_device(uuid,text,text,text) to authenticated;

revoke execute on function public.reserve_receipt_number(uuid,uuid,integer) from public;
revoke execute on function public.reserve_receipt_number(uuid,uuid,integer) from anon;
grant execute on function public.reserve_receipt_number(uuid,uuid,integer) to authenticated;

revoke execute on function public.revoke_device(uuid,uuid,uuid) from public;
revoke execute on function public.revoke_device(uuid,uuid,uuid) from anon;
grant execute on function public.revoke_device(uuid,uuid,uuid) to authenticated;

revoke execute on function public.user_has_business_access(uuid) from public;
revoke execute on function public.user_has_business_access(uuid) from anon;
grant execute on function public.user_has_business_access(uuid) to authenticated;
