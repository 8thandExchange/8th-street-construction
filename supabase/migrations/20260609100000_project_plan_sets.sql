set search_path = public, extensions;

-- =====================================================================
-- PLANS & RENDERINGS — versioned plan sets with client sign-off record
-- =====================================================================

create type plan_set_status as enum (
  'draft',
  'pending_client',
  'approved',
  'revision_requested'
);

create type plan_file_kind as enum (
  'plan',
  'rendering',
  'elevation',
  'site_plan',
  'other'
);

create table project_plan_sets (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  version int not null,
  title text not null,
  description text,
  status plan_set_status not null default 'draft',
  jurisdiction_key text,
  regulations_snapshot jsonb,
  created_by uuid references profiles(id) on delete set null,
  sent_to_client_at timestamptz,
  client_signed_at timestamptz,
  client_signed_by uuid references profiles(id) on delete set null,
  client_signature_text text,
  client_acknowledgment text,
  revision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, version)
);

create index project_plan_sets_project_idx on project_plan_sets(project_id, version desc);
create index project_plan_sets_status_idx on project_plan_sets(project_id, status);

create table project_plan_files (
  id uuid primary key default uuid_generate_v4(),
  plan_set_id uuid not null references project_plan_sets(id) on delete cascade,
  title text not null,
  description text,
  kind plan_file_kind not null default 'plan',
  storage_path text not null,
  file_type text,
  file_size_bytes bigint,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index project_plan_files_set_idx on project_plan_files(plan_set_id, display_order);

-- =====================================================================
-- RLS
-- =====================================================================
alter table project_plan_sets enable row level security;
alter table project_plan_files enable row level security;

create policy "Admin manages plan sets" on project_plan_sets
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads own plan sets" on project_plan_sets
  for select using (
    status != 'draft'
    and exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

create policy "Client signs plan sets" on project_plan_sets
  for update using (
    status = 'pending_client'
    and exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

create policy "Admin manages plan files" on project_plan_files
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads plan files" on project_plan_files
  for select using (
    exists (
      select 1
      from project_plan_sets ps
      join projects p on p.id = ps.project_id
      where ps.id = plan_set_id
        and p.client_id = auth.uid()
        and ps.status != 'draft'
    )
  );

drop trigger if exists set_updated_at_project_plan_sets on project_plan_sets;
create trigger set_updated_at_project_plan_sets
  before update on project_plan_sets
  for each row execute function public.set_updated_at();
