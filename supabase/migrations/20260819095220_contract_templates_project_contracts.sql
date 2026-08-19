-- =====================================================================
-- STANDARD CONTRACTS AND PER-JOB AGREEMENTS.
--
-- The signed 608 Macon agreement is the company standard. Templates hold
-- that standard text (single-family and multifamily variants) with merge
-- fields; a project contract is the template merged with one job's
-- specifics, fully editable per job, tracked from draft to signed. The
-- signed PDF that comes back from e-sign still lives in project_documents
-- (category 'contract') and links back here.
-- =====================================================================

create table contract_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  project_type text not null
    check (project_type in ('single_family', 'multifamily')),
  body_md text not null,                  -- full agreement, {{merge_fields}}
  notes text,                             -- when to use it, open legal items
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table contract_templates is
  'The standard construction agreements. body_md carries {{merge_fields}}
   that are filled from job specifics when a project contract is drafted.';

alter table contract_templates enable row level security;

create policy "Admin manages contract templates" on contract_templates
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists contract_templates_updated_at on contract_templates;
create trigger contract_templates_updated_at
  before update on contract_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------

create table project_contracts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null,                    -- Agreement #1, #2 per project
  template_id uuid references contract_templates(id) on delete set null,
  title text not null,
  owner_name text not null,               -- counterparty legal name
  contract_price numeric(12,2) not null,
  effective_date date,
  body_md text not null,                  -- merged text, editable per job
  status text not null default 'draft'
    check (status in ('draft', 'out_for_signature', 'signed', 'void')),
  status_note text,                       -- how it was signed / why voided
  signed_document_id uuid references project_documents(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create index project_contracts_project_idx on project_contracts(project_id);

comment on table project_contracts is
  'Per-job agreements drafted from a contract template. Marking one signed
   sets the project''s contract_value; the countersigned PDF is a
   project_documents row linked via signed_document_id.';

alter table project_contracts enable row level security;

create policy "Admin manages project contracts" on project_contracts
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists project_contracts_updated_at on project_contracts;
create trigger project_contracts_updated_at
  before update on project_contracts
  for each row execute function public.set_updated_at();
