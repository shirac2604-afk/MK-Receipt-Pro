-- Atomic reminder dispatcher primitives.
-- A worker claims due reminders before attempting delivery so two devices
-- cannot send the same reminder at the same time.

create or replace function public.claim_due_lesson_reminders(
  p_limit integer default 20
)
returns table (
  reminder_id uuid,
  business_id uuid,
  lesson_id uuid,
  student_id uuid,
  guardian_id uuid,
  audience text,
  channel text,
  scheduled_for timestamptz,
  student_name text,
  recipient_name text,
  recipient_phone text,
  recipient_email text,
  lesson_title text,
  lesson_starts_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_REMINDER_LIMIT';
  end if;

  return query
  with candidates as (
    select r.id
    from public.lesson_reminders r
    where r.status = 'pending'
      and r.scheduled_for <= now()
      and public.user_has_business_access(r.business_id)
    order by r.scheduled_for, r.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.lesson_reminders r
       set status = 'sending',
           attempt_count = r.attempt_count + 1,
           last_error = null,
           updated_at = now()
      from candidates c
     where r.id = c.id
    returning r.*
  )
  select
    r.id,
    r.business_id,
    r.lesson_id,
    r.student_id,
    r.guardian_id,
    r.audience,
    r.channel,
    r.scheduled_for,
    s.display_name,
    case when r.audience = 'guardian' then coalesce(g.display_name, s.display_name) else s.display_name end,
    case when r.audience = 'guardian' then g.phone else s.phone end,
    case when r.audience = 'guardian' then g.email else s.email end,
    l.title,
    l.starts_at
  from claimed r
  join public.students s
    on s.business_id = r.business_id and s.id = r.student_id
  join public.lessons l
    on l.business_id = r.business_id and l.id = r.lesson_id
  left join public.student_guardians g
    on g.business_id = r.business_id and g.id = r.guardian_id;
end;
$$;

grant execute on function public.claim_due_lesson_reminders(integer) to authenticated;

create or replace function public.finish_lesson_reminder(
  p_reminder_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select r.business_id into v_business_id
  from public.lesson_reminders r
  where r.id = p_reminder_id
  for update;

  if v_business_id is null then
    raise exception 'REMINDER_NOT_FOUND';
  end if;

  if not public.user_has_business_access(v_business_id) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  update public.lesson_reminders
     set status = case when p_success then 'sent' else 'failed' end,
         sent_at = case when p_success then now() else sent_at end,
         last_error = case when p_success then null else left(coalesce(p_error,'REMINDER_DELIVERY_FAILED'),1000) end,
         updated_at = now()
   where id = p_reminder_id
     and status = 'sending';
end;
$$;

grant execute on function public.finish_lesson_reminder(uuid,boolean,text) to authenticated;

create or replace function public.release_stale_lesson_reminders()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.lesson_reminders
     set status = 'pending',
         last_error = 'STALE_CLAIM_RELEASED',
         updated_at = now()
   where status = 'sending'
     and updated_at < now() - interval '10 minutes'
     and public.user_has_business_access(business_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.release_stale_lesson_reminders() to authenticated;
