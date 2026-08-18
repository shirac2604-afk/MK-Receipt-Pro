-- Preserve atomic/idempotent lesson receipt issuance while using the correct
-- description for individual versus group lessons.

create or replace function public.issue_lesson_receipt(
  p_participant_id uuid,
  p_device_id uuid
)
returns table(
  receipt_id uuid,
  receipt_number bigint,
  issued_at timestamptz,
  receipt_status text,
  customer_id uuid,
  client_name text,
  client_phone text,
  client_email text,
  description text,
  amount_agorot bigint,
  payment_date date,
  payment_method text,
  reference_number text
)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_business uuid;
  v_student uuid;
  v_payer uuid;
  v_attendance text;
  v_payment_status text;
  v_amount bigint;
  v_payment_method text;
  v_paid_at timestamptz;
  v_existing_receipt uuid;
  v_requested_at timestamptz;
  v_lesson_title text;
  v_lesson_kind text;
  v_student_name text;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_payment_date date;
  v_description text;
  v_reference text;
  v_reservation_id uuid;
  v_reserved_number bigint;
  v_expires timestamptz;
  v_receipt_id uuid;
  v_receipt_number bigint;
  v_issued_at timestamptz;
  v_status text;
begin
  select lp.business_id, lp.student_id, lp.payer_customer_id,
         lp.attendance_status, lp.payment_status, lp.amount_agorot,
         lp.payment_method, lp.paid_at, lp.receipt_id, lp.receipt_requested_at,
         l.title, l.kind, s.display_name, c.display_name, c.phone, c.email
    into v_business, v_student, v_payer,
         v_attendance, v_payment_status, v_amount,
         v_payment_method, v_paid_at, v_existing_receipt, v_requested_at,
         v_lesson_title, v_lesson_kind, v_student_name, v_customer_name, v_customer_phone, v_customer_email
  from public.lesson_participants lp
  join public.lessons l on l.id=lp.lesson_id and l.business_id=lp.business_id
  join public.students s on s.id=lp.student_id and s.business_id=lp.business_id
  left join public.customers c on c.id=lp.payer_customer_id and c.business_id=lp.business_id
  where lp.id=p_participant_id
  for update of lp;

  if not found then raise exception 'LESSON_PARTICIPANT_NOT_FOUND'; end if;
  if (select auth.uid()) is null or not public.user_has_business_access(v_business) then
    raise exception 'BUSINESS_ACCESS_DENIED';
  end if;

  if v_existing_receipt is not null then
    return query
      select r.id, r.receipt_number, r.issued_at, r.status,
             r.customer_id, r.client_name, r.client_phone, r.client_email,
             r.description, r.amount_agorot, r.payment_date, r.payment_method,
             r.reference_number
      from public.receipts r
      where r.id=v_existing_receipt and r.business_id=v_business;
    return;
  end if;

  if v_attendance <> 'attended' then raise exception 'LESSON_NOT_ATTENDED'; end if;
  if v_payment_status <> 'paid' or v_paid_at is null then raise exception 'LESSON_NOT_PAID'; end if;
  if v_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if v_payment_method not in ('cash','bank_transfer','bit','paybox') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if v_payer is null or v_customer_name is null then raise exception 'LESSON_PAYER_REQUIRED'; end if;

  if v_requested_at is not null and v_requested_at > now()-interval '10 minutes' then
    raise exception 'LESSON_RECEIPT_ALREADY_IN_PROGRESS';
  end if;

  update public.lesson_participants
     set receipt_requested_at=now(), receipt_error=null, updated_at=now()
   where id=p_participant_id;

  v_payment_date := (v_paid_at at time zone 'Asia/Jerusalem')::date;
  v_description := concat(
    case when v_lesson_kind='group' then 'שיעור קבוצתי - ' else 'שיעור פרטי - ' end,
    coalesce(nullif(trim(v_lesson_title),''), v_student_name)
  );
  v_reference := concat('lesson:', p_participant_id::text);

  select r.reservation_id, r.receipt_number, r.expires_at
    into v_reservation_id, v_reserved_number, v_expires
  from public.reserve_receipt_number(v_business,p_device_id,15) r;

  select r.id, r.receipt_number, r.issued_at, r.status
    into v_receipt_id, v_receipt_number, v_issued_at, v_status
  from public.issue_receipt_from_reservation(
    v_business,p_device_id,v_reservation_id,v_payment_date,v_payer,
    v_customer_name,v_customer_phone,v_customer_email,v_description,
    v_amount,v_payment_method,v_reference
  ) r;

  if v_receipt_id is null then raise exception 'LESSON_RECEIPT_ISSUE_EMPTY'; end if;

  update public.lesson_participants
     set receipt_id=v_receipt_id, receipt_requested_at=null, receipt_error=null, updated_at=now()
   where id=p_participant_id;

  return query select v_receipt_id,v_receipt_number,v_issued_at,v_status,
    v_payer,v_customer_name,v_customer_phone,v_customer_email,v_description,
    v_amount,v_payment_date,v_payment_method,v_reference;
end;
$function$;

revoke execute on function public.issue_lesson_receipt(uuid,uuid) from public;
revoke execute on function public.issue_lesson_receipt(uuid,uuid) from anon;
grant execute on function public.issue_lesson_receipt(uuid,uuid) to authenticated;
