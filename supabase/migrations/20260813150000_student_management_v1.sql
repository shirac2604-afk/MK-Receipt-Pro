-- Student management V1 for MK Receipt Pro.
-- New tables are tenant-scoped and do not issue receipts themselves.
-- Receipt issuance remains owned by the existing receipt engine.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  display_name text not null,
  school_name text,
  school_grade text,
  focus_notes text,
  default_price_agorot integer not null default 0 check (default_price_agorot >= 0),
  payer_customer_id uuid,
  reminder_enabled boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint students_name_length check (char_length(btrim(display_name)) between 2 and 160),
  constraint students_school_length check (school_name is null or char_length(school_name) <= 160),
  constraint students_grade_length check (school_grade is null or char_length(school_grade) <= 80),
  constraint students_focus_length check (focus_notes is null or char_length(focus_notes) <= 4000)
);

create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  student_id uuid not null,
  display_name text not null,
  relationship text,
  phone text,
  email text,
  is_primary boolean not null default false,
  receives_reminders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint student_guardians_student_fk foreign key (business_id, student_id)
    references public.students(business_id, id) on delete cascade,
  constraint guardian_name_length check (char_length(btrim(display_name)) between 2 and 160),
  constraint guardian_phone_length check (phone is null or char_length(phone) <= 20),
  constraint guardian_email_length check (email is null or char_length(email) <= 254),
  constraint guardian_relationship_length check (relationship is null or char_length(relationship) <= 80)
);

create table if not exists public.student_groups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint student_groups_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint student_groups_description_length check (description is null or char_length(description) <= 2000)
);

create table if not exists public.student_group_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  group_id uuid not null,
  student_id uuid not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (group_id, student_id),
  constraint group_members_group_fk foreign key (business_id, group_id)
    references public.student_groups(business_id, id) on delete cascade,
  constraint group_members_student_fk foreign key (business_id, student_id)
    references public.students(business_id, id) on delete cascade,
  constraint group_members_dates check (left_at is null or left_at >= joined_at)
);

create table if not exists public.lesson_series (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('individual','group')),
  student_id uuid,
  group_id uuid,
  title text not null,
  weekday smallint not null check (weekday between 0 and 6),
  local_start_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  recurrence_interval_weeks integer not null default 1 check (recurrence_interval_weeks between 1 and 12),
  starts_on date not null,
  ends_on date,
  default_price_agorot integer not null default 0 check (default_price_agorot >= 0),
  parent_reminder_minutes integer not null default 1440 check (parent_reminder_minutes between 0 and 10080),
  student_reminder_minutes integer not null default 120 check (student_reminder_minutes between 0 and 10080),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint lesson_series_student_fk foreign key (business_id, student_id)
    references public.students(business_id, id) on delete cascade,
  constraint lesson_series_group_fk foreign key (business_id, group_id)
    references public.student_groups(business_id, id) on delete cascade,
  constraint lesson_series_target check (
    (kind = 'individual' and student_id is not null and group_id is null)
    or (kind = 'group' and group_id is not null and student_id is null)
  ),
  constraint lesson_series_dates check (ends_on is null or ends_on >= starts_on),
  constraint lesson_series_title_length check (char_length(btrim(title)) between 2 and 160)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  series_id uuid,
  kind text not null check (kind in ('individual','group')),
  student_id uuid,
  group_id uuid,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  lesson_summary text,
  homework text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (series_id, starts_at),
  constraint lessons_series_fk foreign key (business_id, series_id)
    references public.lesson_series(business_id, id) on delete set null,
  constraint lessons_student_fk foreign key (business_id, student_id)
    references public.students(business_id, id) on delete cascade,
  constraint lessons_group_fk foreign key (business_id, group_id)
    references public.student_groups(business_id, id) on delete cascade,
  constraint lessons_target check (
    (kind = 'individual' and student_id is not null and group_id is null)
    or (kind = 'group' and group_id is not null and student_id is null)
  ),
  constraint lessons_time check (ends_at > starts_at),
  constraint lessons_summary_length check (lesson_summary is null or char_length(lesson_summary) <= 8000),
  constraint lessons_homework_length check (homework is null or char_length(homework) <= 4000)
);

create table if not exists public.lesson_participants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lesson_id uuid not null,
  student_id uuid not null,
  payer_customer_id uuid,
  attendance_status text not null default 'scheduled'
    check (attendance_status in ('scheduled','attended','absent','cancelled','late_cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','waived','refunded')),
  amount_agorot integer not null default 0 check (amount_agorot >= 0),
  payment_method text,
  paid_at timestamptz,
  receipt_id uuid,
  receipt_requested_at timestamptz,
  receipt_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, student_id),
  unique (receipt_id),
  unique (business_id, id),
  constraint lesson_participants_lesson_fk foreign key (business_id, lesson_id)
    references public.lessons(business_id, id) on delete cascade,
  constraint lesson_participants_student_fk foreign key (business_id, student_id)
    references public.students(business_id, id) on delete cascade,
  constraint lesson_participants_paid_state check (
    (payment_status = 'paid' and paid_at is not null and payment_method is not null)
    or (payment_status <> 'paid')
  ),
  constraint lesson_participants_payment_method check (
    payment_method is null or payment_method in ('cash','bank_transfer','bit','paybox')
  ),
  constraint lesson_participants_receipt_error_length check (receipt_error is null or char_length(receipt_error) <= 1000)
);

create table if not exists public.lesson_reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lesson_id uuid not null,
  student_id uuid not null,
  guardian_id uuid,
  audience text not null check (audience in ('student','guardian')),
  channel text not null check (channel in ('whatsapp','sms','email','in_app')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','cancelled')),
  sent_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, student_id, audience, guardian_id, channel, scheduled_for),
  constraint lesson_reminders_lesson_fk foreign key (business_id, lesson_id)
    references public.lessons(business_id, id) on delete cascade,
  constraint lesson_reminders_student_fk foreign key (business_id, student_id)
    references public.students(business_id, id) on delete cascade,
  constraint lesson_reminders_guardian_fk foreign key (business_id, guardian_id)
    references public.student_guardians(business_id, id) on delete cascade,
  constraint lesson_reminders_error_length check (last_error is null or char_length(last_error) <= 1000)
);

-- Link payers/receipts to existing MK Receipt Pro entities without duplicating financial records.
alter table public.students
  add constraint students_payer_customer_fk
  foreign key (payer_customer_id) references public.customers(id) on delete set null;

alter table public.lesson_participants
  add constraint lesson_participants_payer_customer_fk
  foreign key (payer_customer_id) references public.customers(id) on delete set null;

alter table public.lesson_participants
  add constraint lesson_participants_receipt_fk
  foreign key (receipt_id) references public.receipts(id) on delete set null;

create index if not exists idx_students_business_active on public.students(business_id, active, display_name);
create index if not exists idx_student_guardians_student on public.student_guardians(business_id, student_id);
create index if not exists idx_group_members_student on public.student_group_members(business_id, student_id);
create index if not exists idx_lesson_series_business_active on public.lesson_series(business_id, active);
create index if not exists idx_lessons_business_starts on public.lessons(business_id, starts_at);
create index if not exists idx_lesson_participants_open_payment on public.lesson_participants(business_id, payment_status, attendance_status);
create index if not exists idx_lesson_reminders_due on public.lesson_reminders(status, scheduled_for);

alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_groups enable row level security;
alter table public.student_group_members enable row level security;
alter table public.lesson_series enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_participants enable row level security;
alter table public.lesson_reminders enable row level security;

-- Tenant policies. WITH CHECK prevents cross-tenant insert/update even when IDs are guessed.
do $$
declare
  t text;
begin
  foreach t in array array[
    'students','student_guardians','student_groups','student_group_members',
    'lesson_series','lessons','lesson_participants','lesson_reminders'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_access', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.user_has_business_access(business_id)) with check (public.user_has_business_access(business_id))',
      t || '_tenant_access', t
    );
  end loop;
end $$;

-- Convenience view for app logic. This does NOT issue a receipt; it only exposes eligibility.
create or replace view public.lesson_receipt_candidates
with (security_invoker = true)
as
select
  lp.id as lesson_participant_id,
  lp.business_id,
  lp.lesson_id,
  lp.student_id,
  lp.payer_customer_id,
  lp.amount_agorot,
  lp.payment_method,
  lp.paid_at
from public.lesson_participants lp
where lp.attendance_status = 'attended'
  and lp.payment_status = 'paid'
  and lp.paid_at is not null
  and lp.amount_agorot > 0
  and lp.payer_customer_id is not null
  and lp.receipt_id is null;

grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.student_guardians to authenticated;
grant select, insert, update, delete on public.student_groups to authenticated;
grant select, insert, update, delete on public.student_group_members to authenticated;
grant select, insert, update, delete on public.lesson_series to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_participants to authenticated;
grant select, insert, update, delete on public.lesson_reminders to authenticated;
grant select on public.lesson_receipt_candidates to authenticated;
