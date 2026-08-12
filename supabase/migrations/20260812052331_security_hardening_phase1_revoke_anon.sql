-- Applied to production on 2026-08-12.
-- Explicitly revoke the anon role as well as PUBLIC; authenticated clients retain access.

REVOKE EXECUTE ON FUNCTION public.cancel_receipt_cloud(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_receipt_cloud(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_receipt_reservation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_receipt_reservation(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_business_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_business_access(uuid) TO authenticated;
