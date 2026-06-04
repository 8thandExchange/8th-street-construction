set search_path = public, extensions;

-- =====================================================================
-- COMPANY COMPLIANCE — licenses, insurance, bonds (company-wide)
-- =====================================================================
create type compliance_category as enum (
  'license',
  'insurance',
  'bond',
  'registration',
  'certification',
  'tax',
  'safety',
  'other'
);

create type compliance_status as enum (
  'active',
  'expiring_soon',
  'expired',
  'pending',
  'not_applicable'
);

create table company_compliance_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category compliance_category not null default 'other',
  jurisdiction text,
  holder_name text,
  policy_or_license_number text,
  issued_at date,
  expires_at date,
  renewal_lead_days int not null default 60,
  renewal_urgent_days int not null default 14,
  renewal_cycle text,
  document_storage_path text,
  status compliance_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index company_compliance_expires_idx on company_compliance_items(expires_at);
create index company_compliance_status_idx on company_compliance_items(status);

create table compliance_reminder_log (
  id uuid primary key default uuid_generate_v4(),
  compliance_item_id uuid not null references company_compliance_items(id) on delete cascade,
  reminder_tier text not null,
  sent_to text not null,
  days_until_expiry int,
  sent_at timestamptz not null default now()
);

create index compliance_reminder_item_idx on compliance_reminder_log(compliance_item_id, reminder_tier, sent_at desc);

-- =====================================================================
-- PROJECT DAILY LOGS — field documentation (Buildertrend-style)
-- =====================================================================
create table project_daily_logs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  log_date date not null default current_date,
  author_id uuid references profiles(id) on delete set null,
  weather text,
  crew_count int,
  summary text not null,
  issues text,
  created_at timestamptz not null default now(),
  unique(project_id, log_date)
);

create index project_daily_logs_project_idx on project_daily_logs(project_id, log_date desc);

-- RLS
alter table company_compliance_items enable row level security;
alter table compliance_reminder_log enable row level security;
alter table project_daily_logs enable row level security;

create policy "Admin manages compliance items" on company_compliance_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin reads reminder log" on compliance_reminder_log
  for select using (public.is_admin());

create policy "Admin manages daily logs" on project_daily_logs
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads own project daily logs" on project_daily_logs
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

-- updated_at trigger for compliance
drop trigger if exists set_updated_at_company_compliance on company_compliance_items;
create trigger set_updated_at_company_compliance
  before update on company_compliance_items
  for each row execute function public.set_updated_at();
