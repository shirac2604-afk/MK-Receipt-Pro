-- Student contact details are separate from guardian/payer details.
-- Required for reminder delivery to the student without conflating the student with the payer.

alter table public.students
  add column if not exists phone text,
  add column if not exists email text;

alter table public.students
  drop constraint if exists students_phone_length,
  add constraint students_phone_length check (phone is null or char_length(phone) <= 20),
  drop constraint if exists students_email_length,
  add constraint students_email_length check (email is null or char_length(email) <= 254);
