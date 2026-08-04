-- =====================================================================
-- VENDORS (creditors) & VENDOR BILLS — accounts payable.
-- A vendor is a company that bills us (consultants, suppliers, service
-- providers). Bills are recorded against jobs (optional), tracked
-- open/paid, with the vendor's invoice file attached.
-- =====================================================================

create table vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_path text,                         -- project-documents storage path
  contact_email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vendors_name_idx on vendors (lower(name));

create table vendor_bills (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  bill_number text,                       -- the vendor's own invoice number
  title text not null,
  amount numeric(12,2) not null,
  status text not null default 'open' check (status in ('open','paid','void')),
  issued_date date,
  due_date date,
  paid_at timestamptz,
  file_path text,                         -- attached vendor invoice (storage)
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendor_bills_vendor_idx on vendor_bills(vendor_id, created_at desc);
create index vendor_bills_project_idx on vendor_bills(project_id) where project_id is not null;
create index vendor_bills_status_idx on vendor_bills(status) where status = 'open';

create trigger vendors_updated_at
  before update on vendors
  for each row execute function public.set_updated_at();

create trigger vendor_bills_updated_at
  before update on vendor_bills
  for each row execute function public.set_updated_at();

alter table vendors enable row level security;
alter table vendor_bills enable row level security;

create policy "Admin manages vendors" on vendors
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages vendor bills" on vendor_bills
  for all using (public.is_admin()) with check (public.is_admin());

-- Frequently-used creditor, ready on day one
insert into vendors (name, notes)
values ('Monte Cristo Consulting', 'Recurring consulting creditor');
