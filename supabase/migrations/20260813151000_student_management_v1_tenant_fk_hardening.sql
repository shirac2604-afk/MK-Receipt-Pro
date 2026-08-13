-- Follow-up hardening for Student Management V1.
-- Existing customer/receipt ids are globally unique, but the student module additionally
-- binds references to business_id so the database itself rejects cross-tenant linkage.

create unique index if not exists customers_business_id_id_uq
  on public.customers(business_id, id);

create unique index if not exists receipts_business_id_id_uq
  on public.receipts(business_id, id);

alter table public.students
  drop constraint if exists students_payer_customer_fk;

alter table public.students
  add constraint students_payer_customer_tenant_fk
  foreign key (business_id, payer_customer_id)
  references public.customers(business_id, id)
  on delete restrict;

alter table public.lesson_participants
  drop constraint if exists lesson_participants_payer_customer_fk;

alter table public.lesson_participants
  add constraint lesson_participants_payer_customer_tenant_fk
  foreign key (business_id, payer_customer_id)
  references public.customers(business_id, id)
  on delete restrict;

alter table public.lesson_participants
  drop constraint if exists lesson_participants_receipt_fk;

alter table public.lesson_participants
  add constraint lesson_participants_receipt_tenant_fk
  foreign key (business_id, receipt_id)
  references public.receipts(business_id, id)
  on delete restrict;

-- Preserve lesson history if a recurrence definition is retired. Series are soft-disabled;
-- physical deletion is blocked while generated lessons still reference the series.
alter table public.lessons
  drop constraint if exists lessons_series_fk;

alter table public.lessons
  add constraint lessons_series_tenant_fk
  foreign key (business_id, series_id)
  references public.lesson_series(business_id, id)
  on delete restrict;
