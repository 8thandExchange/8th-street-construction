-- =====================================================================
-- INSPECTIONS AND VENDOR COMPLIANCE become real records.
--
-- Inspections existed only as task titles inside the playbooks — no
-- scheduled/passed/failed state, no inspector, no re-inspection chain.
-- Vendor-side compliance (COIs, W-9s, licenses, lien waivers) was not
-- tracked at all, while our own company items were.
-- =====================================================================

create table project_inspections (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,                    -- "Framing inspection"
  trade text,
  inspector text,                         -- name / jurisdiction
  scheduled_date date,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'passed', 'failed', 'waived')),
  result_notes text,
  resulted_at timestamptz,
  -- A failed inspection gets a fresh row for the retest; the chain is
  -- the paper trail an inspector or lender wants to see.
  reinspection_of uuid references project_inspections(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_inspections_project_idx
  on project_inspections(project_id, scheduled_date);

comment on table project_inspections is
  'Municipal/lender inspections with real state: scheduled, passed,
   failed (chained to the re-inspection), or waived.';

alter table project_inspections enable row level security;

create policy "Admin manages inspections" on project_inspections
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists project_inspections_updated_at on project_inspections;
create trigger project_inspections_updated_at
  before update on project_inspections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------

create table vendor_compliance_items (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  kind text not null
    check (kind in ('coi', 'w9', 'license', 'lien_waiver', 'other')),
  label text not null,                    -- "GL certificate of insurance"
  expires_on date,                        -- null = does not expire (e.g. W-9)
  received_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendor_compliance_vendor_idx on vendor_compliance_items(vendor_id);
create index vendor_compliance_expires_idx on vendor_compliance_items(expires_on);

comment on table vendor_compliance_items is
  'Per-vendor paperwork: COIs, W-9s, licenses, lien waivers. Mirrors
   company_compliance_items, which covers our own licenses/insurance.';

alter table vendor_compliance_items enable row level security;

create policy "Admin manages vendor compliance" on vendor_compliance_items
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists vendor_compliance_items_updated_at on vendor_compliance_items;
create trigger vendor_compliance_items_updated_at
  before update on vendor_compliance_items
  for each row execute function public.set_updated_at();
