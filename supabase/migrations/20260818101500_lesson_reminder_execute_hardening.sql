-- Explicitly prevent unauthenticated callers from executing reminder worker RPCs.
-- Tenant authorization still happens inside each function through user_has_business_access().

revoke execute on function public.claim_due_lesson_reminders(integer) from public;
revoke execute on function public.claim_due_lesson_reminders(integer) from anon;
grant execute on function public.claim_due_lesson_reminders(integer) to authenticated;

revoke execute on function public.finish_lesson_reminder(uuid,boolean,text) from public;
revoke execute on function public.finish_lesson_reminder(uuid,boolean,text) from anon;
grant execute on function public.finish_lesson_reminder(uuid,boolean,text) to authenticated;

revoke execute on function public.release_stale_lesson_reminders() from public;
revoke execute on function public.release_stale_lesson_reminders() from anon;
grant execute on function public.release_stale_lesson_reminders() to authenticated;
