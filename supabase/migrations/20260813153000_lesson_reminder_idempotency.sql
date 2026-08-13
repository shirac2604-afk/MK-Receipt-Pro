-- Prevent duplicate reminder jobs when recurring lessons are regenerated.
-- PostgreSQL UNIQUE treats NULL values as distinct, so student reminders (guardian_id NULL)
-- need an explicit partial unique index.

create unique index if not exists lesson_reminders_student_job_uq
  on public.lesson_reminders(lesson_id, student_id, audience, channel, scheduled_for)
  where guardian_id is null;

create unique index if not exists lesson_reminders_guardian_job_uq
  on public.lesson_reminders(lesson_id, student_id, guardian_id, audience, channel, scheduled_for)
  where guardian_id is not null;
