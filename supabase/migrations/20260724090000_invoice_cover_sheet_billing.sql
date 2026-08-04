set search_path = public, extensions;

-- =====================================================================
-- Habitat/city billing model (mirrors the M Homebuilders packet):
--   * The city approves a per-house budget with numbered lines ("City #").
--   * Each invoice to Habitat is a COVER SHEET: every line carries a
--     description, a backup invoice # ("Inv. #"), a City # and an amount.
--   * The backup invoices are attached behind the cover sheet, and the
--     invoice total is the sum of those backups (line items already sum).
-- =====================================================================

-- City-approved budget lines per project (e.g. H-87 for 608 Macon)
create table if not exists city_budget_lines (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  city_number int not null,
  description text not null,
  budget_amount numeric(12, 2) not null default 0,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, city_number)
);

create index if not exists city_budget_lines_project_idx
  on city_budget_lines(project_id, city_number);

comment on table city_budget_lines is
  'City-approved budget per Habitat house — the "City #" lines every invoice bills against';

-- Cover-sheet columns on invoice line items
alter table invoice_line_items
  add column if not exists reference_number text,
  add column if not exists city_budget_line_id uuid references city_budget_lines(id) on delete set null;

comment on column invoice_line_items.reference_number is
  'Backup invoice number this line bills ("Inv. #" on the cover sheet)';
comment on column invoice_line_items.city_budget_line_id is
  'City budget line this amount draws against ("City #" on the cover sheet)';

-- Backup invoices (vendor/sub PDFs) attached behind the cover sheet
create table if not exists invoice_attachments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  line_item_id uuid references invoice_line_items(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  media_type text not null default 'application/pdf',
  file_size bigint,
  display_order int not null default 0,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_attachments_invoice_idx
  on invoice_attachments(invoice_id, display_order);

comment on table invoice_attachments is
  'Backup invoice files merged behind the cover sheet in the invoice packet PDF';

-- RLS
alter table city_budget_lines enable row level security;
alter table invoice_attachments enable row level security;

create policy "Admin manages city budget lines" on city_budget_lines
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own project city budget" on city_budget_lines
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

create policy "Admin manages invoice attachments" on invoice_attachments
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own invoice attachments" on invoice_attachments
  for select using (
    exists (
      select 1 from invoices i
      where i.id = invoice_id
        and (i.client_id = auth.uid() or exists (
          select 1 from projects p where p.id = i.project_id and p.client_id = auth.uid()
        ))
    )
  );

drop trigger if exists set_updated_at_city_budget_lines on city_budget_lines;
create trigger set_updated_at_city_budget_lines
  before update on city_budget_lines
  for each row execute function public.set_updated_at();
