-- =====================================================================
-- RFIs AND SUBMITTALS.
--
-- An RFI is a written question with an owner, a trade, optional plan
-- context, and a recorded answer. A submittal is a product or shop
-- drawing that needs a decision before it is released to the field.
-- =====================================================================

create table if not exists project_rfis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null,
  title text not null,
  question text not null,
  trade text,
  plan_set_id uuid references project_plan_sets(id) on delete set null,
  milestone_id uuid references project_milestones(id) on delete set null,
  schedule_impact text not null default 'none'
    check (schedule_impact in ('none', 'possible', 'likely')),
  days_impact int,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'answered', 'closed', 'void')),
  answer text,
  answered_at timestamptz,
  answered_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create index if not exists project_rfis_project_idx on project_rfis(project_id, status);

comment on table project_rfis is
  'Requests for information. Open rows wait on a client or reviewer answer.';

create table if not exists project_submittals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null,
  title text not null,
  trade text,
  spec_section text,
  plan_set_id uuid references project_plan_sets(id) on delete set null,
  document_id uuid references project_documents(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'in_review', 'approved', 'approved_as_noted', 'rejected', 'void')),
  notes text,
  reviewer_notes text,
  due_date date,
  decided_at timestamptz,
  decided_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create index if not exists project_submittals_project_idx on project_submittals(project_id, status);

comment on table project_submittals is
  'Product data and shop drawings awaiting an approve / approve-as-noted / reject decision.';

alter table project_rfis enable row level security;
alter table project_submittals enable row level security;

drop policy if exists "Admin manages RFIs" on project_rfis;
create policy "Admin manages RFIs"
  on project_rfis for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Clients read sent RFIs" on project_rfis;
create policy "Clients read sent RFIs"
  on project_rfis for select
  using (
    status in ('open', 'answered', 'closed')
    and public.client_has_project_portal_access(project_id)
  );

drop policy if exists "Admin manages submittals" on project_submittals;
create policy "Admin manages submittals"
  on project_submittals for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists project_rfis_updated_at on project_rfis;
create trigger project_rfis_updated_at
  before update on project_rfis
  for each row execute function public.set_updated_at();

drop trigger if exists project_submittals_updated_at on project_submittals;
create trigger project_submittals_updated_at
  before update on project_submittals
  for each row execute function public.set_updated_at();
