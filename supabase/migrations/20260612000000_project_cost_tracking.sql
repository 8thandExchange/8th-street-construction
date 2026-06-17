set search_path = public, extensions;

-- =====================================================================
-- Three money buckets per job:
--   estimated_cost     = what we think it costs us (internal estimator)
--   contract_value     = what we bill the client (Habitat, homeowner, etc.)
--   awarded sub bids   = what subs actually quoted (tracked on estimate lines)
-- =====================================================================

alter table projects
  add column if not exists estimated_cost numeric(12, 2),
  add column if not exists estimate_notes text,
  add column if not exists estimate_updated_at timestamptz;

comment on column projects.estimated_cost is 'Internal cost estimate — refined as we learn from real bids';
comment on column projects.contract_value is 'Amount we bill the client — separate from our internal estimate';

-- Line-by-line estimator (trade / division rows)
create table if not exists project_estimate_lines (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  division_code text not null,
  trade_label text not null,
  description text,
  estimated_amount numeric(12, 2) not null default 0,
  awarded_amount numeric(12, 2),
  bid_request_id uuid references bid_requests(id) on delete set null,
  notes text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_estimate_lines_project_idx
  on project_estimate_lines(project_id, display_order);

-- Link scanned quote PDFs to bids (subs do not need portal access)
alter table bids
  add column if not exists document_id uuid references project_documents(id) on delete set null,
  add column if not exists source text not null default 'portal';

comment on column bids.source is 'portal = sub logged in; manual = office entered quote from email/scan';

alter table bid_requests
  add column if not exists estimate_line_id uuid references project_estimate_lines(id) on delete set null;

-- RLS
alter table project_estimate_lines enable row level security;

create policy "Admin manages estimate lines" on project_estimate_lines
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists set_updated_at_project_estimate_lines on project_estimate_lines;
create trigger set_updated_at_project_estimate_lines
  before update on project_estimate_lines
  for each row execute function public.set_updated_at();
