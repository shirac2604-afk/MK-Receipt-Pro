-- MK Receipt Pro shared cloud database
-- Foundation 3
-- PostgreSQL schema with atomic receipt-number reservation.

create extension if not exists pgcrypto;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  business_name text not null,
  owner_name text not null,
  business_number text not null,
  tax_status text not null check (tax_status in ('עוסק פטור','עוסק מורשה')),
  phone text,
  email text,
  address text,
  slogan text,
  brand_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists businesses_business_number_uq
  on businesses(business_number);

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  device_key text not null,
  platform text not null check (platform in ('windows','android')),
  display_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, device_key)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  display_name text not null,
  phone text,
  email text,
  notes text,
  is_archived boolean not null default false,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_business_idx on customers(business_id);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  expense_date date not null,
  supplier_name text not null,
  amount_agorot bigint not null check (amount_agorot > 0),
  category text not null,
  payment_method text,
  notes text,
  attachment_storage_key text,
  attachment_original_name text,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_business_date_idx on expenses(business_id, expense_date desc);

create table if not exists receipt_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  customer_id uuid references customers(id) on delete set null,
  description text not null,
  amount_agorot bigint not null check (amount_agorot > 0),
  payment_method text not null check (payment_method in ('cash','bank_transfer','bit','paybox')),
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists receipt_sequences (
  business_id uuid primary key references businesses(id) on delete cascade,
  next_number bigint not null default 1001 check (next_number > 0),
  last_issued_number bigint not null default 1000 check (last_issued_number >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists receipt_number_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  receipt_number bigint not null,
  status text not null default 'reserved' check (status in ('reserved','consumed','expired','cancelled')),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  unique (business_id, receipt_number)
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  reservation_id uuid not null unique references receipt_number_reservations(id),
  receipt_number bigint not null,
  payment_date date not null,
  issued_at timestamptz not null default now(),
  customer_id uuid references customers(id) on delete set null,
  client_name text not null,
  client_phone text,
  client_email text,
  description text not null,
  amount_agorot bigint not null check (amount_agorot > 0),
  payment_method text not null check (payment_method in ('cash','bank_transfer','bit','paybox')),
  reference_number text,
  status text not null default 'active' check (status in ('active','cancelled')),
  cancellation_reason text,
  cancelled_at timestamptz,
  content_hash text not null,
  pdf_storage_key text,
  cancellation_pdf_storage_key text,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, receipt_number)
);
create index if not exists receipts_business_number_idx on receipts(business_id, receipt_number desc);

create table if not exists sync_mutations (
  mutation_id uuid primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  mutation_kind text not null,
  base_revision bigint,
  result_revision bigint,
  status text not null check (status in ('accepted','conflict','rejected')),
  conflict_reason text,
  created_at timestamptz not null default now()
);

-- Atomic number allocation.
create or replace function reserve_receipt_number(
  p_business_id uuid,
  p_device_id uuid,
  p_ttl_minutes integer default 15
)
returns table(reservation_id uuid, receipt_number bigint, expires_at timestamptz)
language plpgsql
security definer
as $$
declare
  v_next bigint;
  v_reservation uuid;
  v_expires timestamptz;
begin
  insert into receipt_sequences(business_id,next_number,last_issued_number)
  values(p_business_id,1001,1000)
  on conflict (business_id) do nothing;

  select next_number into v_next
  from receipt_sequences
  where business_id=p_business_id
  for update;

  update receipt_sequences
  set next_number=v_next+1,
      updated_at=now()
  where business_id=p_business_id;

  v_reservation:=gen_random_uuid();
  v_expires:=now() + make_interval(mins => p_ttl_minutes);

  insert into receipt_number_reservations(
    id,business_id,device_id,receipt_number,status,expires_at
  ) values(
    v_reservation,p_business_id,p_device_id,v_next,'reserved',v_expires
  );

  return query select v_reservation,v_next,v_expires;
end;
$$;

-- Consumes a reservation and records the highest number issued.
create or replace function consume_receipt_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_business uuid;
  v_number bigint;
  v_status text;
  v_expires timestamptz;
begin
  select business_id,receipt_number,status,expires_at
    into v_business,v_number,v_status,v_expires
  from receipt_number_reservations
  where id=p_reservation_id
  for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND';
  end if;

  if v_status <> 'reserved' then
    raise exception 'RESERVATION_NOT_ACTIVE';
  end if;

  if v_expires < now() then
    update receipt_number_reservations set status='expired' where id=p_reservation_id;
    raise exception 'RESERVATION_EXPIRED';
  end if;

  update receipt_number_reservations
  set status='consumed',consumed_at=now()
  where id=p_reservation_id;

  update receipt_sequences
  set last_issued_number=greatest(last_issued_number,v_number),
      updated_at=now()
  where business_id=v_business;
end;
$$;
