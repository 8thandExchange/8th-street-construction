-- Mercury invoicing integration — AR customers + invoice sync fields

set search_path = public, extensions;

-- =====================================================================
-- MERCURY CUSTOMERS — one AR customer per client profile
-- =====================================================================
create table mercury_customers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  mercury_customer_id uuid not null unique,
  email citext not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id)
);

create index mercury_customers_profile_idx on mercury_customers(profile_id);

alter table mercury_customers enable row level security;

create policy mercury_customers_admin_all on mercury_customers
  for all
  using (is_admin())
  with check (is_admin());

-- =====================================================================
-- INVOICES — Mercury AR linkage
-- =====================================================================
alter table invoices
  add column if not exists mercury_invoice_id uuid unique,
  add column if not exists mercury_pay_slug text,
  add column if not exists mercury_status text;

create index invoices_mercury_idx on invoices(mercury_invoice_id)
  where mercury_invoice_id is not null;

-- =====================================================================
-- MERCURY WEBHOOK EVENTS — idempotency log
-- =====================================================================
create table mercury_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  mercury_event_id uuid not null unique,
  event_type text not null,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now()
);

alter table mercury_webhook_events enable row level security;

create policy mercury_webhook_events_admin_read on mercury_webhook_events
  for select
  using (is_admin());
