-- Security Phase 11: keep privileged database functions opt-in.
-- Active client RPCs grant authenticated explicitly in their own migrations.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Legacy two-step receipt consumption was replaced by the atomic
-- issue_receipt_from_reservation RPC and has no application callers.
revoke execute on function public.consume_receipt_reservation(uuid)
  from public, anon, authenticated;
