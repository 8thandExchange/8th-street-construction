-- Portal access controls: per-user master switch, per-project primary toggle, additional members.

set search_path = public, extensions;

-- =====================================================================
-- SCHEMA
-- =====================================================================
alter table profiles
  add column if not exists portal_active boolean not null default true;

alter table projects
  add column if not exists client_portal_enabled boolean not null default false;

create table if not exists project_portal_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  portal_enabled boolean not null default false,
  granted_at timestamptz not null default now(),
  granted_by uuid references profiles(id) on delete set null,
  unique (project_id, profile_id)
);

create index if not exists project_portal_members_profile_idx
  on project_portal_members(profile_id, portal_enabled);
create index if not exists project_portal_members_project_idx
  on project_portal_members(project_id, portal_enabled);

alter table project_portal_members enable row level security;

-- Backfill: existing client assignments stay live (no breakage)
update projects
set client_portal_enabled = true
where client_id is not null;

-- =====================================================================
-- ACCESS HELPERS
-- =====================================================================
create or replace function public.client_portal_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select pr.portal_active from profiles pr where pr.id = auth.uid()),
    false
  );
$$;

create or replace function public.client_has_project_portal_access(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.client_portal_is_active()
    and (
      exists (
        select 1
        from projects p
        where p.id = project_uuid
          and p.client_id = auth.uid()
          and p.client_portal_enabled = true
      )
      or exists (
        select 1
        from project_portal_members m
        where m.project_id = project_uuid
          and m.profile_id = auth.uid()
          and m.portal_enabled = true
      )
    );
$$;

grant execute on function public.client_portal_is_active() to authenticated;
grant execute on function public.client_has_project_portal_access(uuid) to authenticated;

-- =====================================================================
-- RLS — project_portal_members
-- =====================================================================
create policy "Admin manages portal members" on project_portal_members
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads own portal memberships" on project_portal_members
  for select using (profile_id = auth.uid());

-- =====================================================================
-- RLS — replace client project access checks (drop + recreate)
-- =====================================================================

-- projects
drop policy if exists "Client reads own project" on projects;
create policy "Client reads own project" on projects
  for select using (public.client_has_project_portal_access(id));

-- project_images
drop policy if exists "Client reads project images" on project_images;
create policy "Client reads project images" on project_images
  for select using (
    visibility in ('public', 'client_only')
    and public.client_has_project_portal_access(project_id)
  );

-- project_milestones
drop policy if exists "Client reads own milestones" on project_milestones;
create policy "Client reads own milestones" on project_milestones
  for select using (public.client_has_project_portal_access(project_id));

-- project_updates
drop policy if exists "Client reads own project updates" on project_updates;
create policy "Client reads own project updates" on project_updates
  for select using (
    visibility in ('client', 'public')
    and public.client_has_project_portal_access(project_id)
  );

-- project_update_images
drop policy if exists "Client reads own update images" on project_update_images;
create policy "Client reads own update images" on project_update_images
  for select using (
    exists (
      select 1 from project_updates u
      where u.id = update_id
        and public.client_has_project_portal_access(u.project_id)
    )
  );

-- project_documents
drop policy if exists "Client reads own documents" on project_documents;
create policy "Client reads own documents" on project_documents
  for select using (
    visibility = 'client'
    and public.client_has_project_portal_access(project_id)
  );

-- project_messages
drop policy if exists "Client reads own project messages" on project_messages;
create policy "Client reads own project messages" on project_messages
  for select using (public.client_has_project_portal_access(project_id));

drop policy if exists "Client writes to own project" on project_messages;
create policy "Client writes to own project" on project_messages
  for insert with check (
    author_id = auth.uid()
    and public.client_has_project_portal_access(project_id)
  );

-- change_orders
drop policy if exists "Client reads own change orders" on change_orders;
create policy "Client reads own change orders" on change_orders
  for select using (public.client_has_project_portal_access(project_id));

drop policy if exists "Client signs change orders" on change_orders;
create policy "Client signs change orders" on change_orders
  for update using (public.client_has_project_portal_access(project_id));

-- project_tasks
drop policy if exists "Client reads own project tasks" on project_tasks;
create policy "Client reads own project tasks" on project_tasks
  for select using (public.client_has_project_portal_access(project_id));

-- invoices (project-scoped reads)
drop policy if exists "Client reads project invoices" on invoices;
create policy "Client reads project invoices" on invoices
  for select using (public.client_has_project_portal_access(project_id));

-- invoice_line_items
drop policy if exists "Client reads own line items" on invoice_line_items;
create policy "Client reads own line items" on invoice_line_items
  for select using (
    exists (
      select 1 from invoices i
      where i.id = invoice_id
        and public.client_has_project_portal_access(i.project_id)
    )
  );

-- payment_draws
drop policy if exists "Client reads own draws" on payment_draws;
create policy "Client reads own draws" on payment_draws
  for select using (public.client_has_project_portal_access(project_id));

-- project_daily_logs
drop policy if exists "Client reads own project daily logs" on project_daily_logs;
create policy "Client reads own project daily logs" on project_daily_logs
  for select using (public.client_has_project_portal_access(project_id));

-- project_selections
drop policy if exists "Client reads visible selections" on project_selections;
create policy "Client reads visible selections" on project_selections
  for select using (
    client_visible = true
    and public.client_has_project_portal_access(project_id)
  );

drop policy if exists "Client updates own selection status" on project_selections;
create policy "Client updates own selection status" on project_selections
  for update using (
    client_visible = true
    and public.client_has_project_portal_access(project_id)
  );

-- punch_list_items
drop policy if exists "Client reads punch list" on punch_list_items;
create policy "Client reads punch list" on punch_list_items
  for select using (public.client_has_project_portal_access(project_id));

-- project_plan_sets
drop policy if exists "Client reads own plan sets" on project_plan_sets;
create policy "Client reads own plan sets" on project_plan_sets
  for select using (public.client_has_project_portal_access(project_id));

drop policy if exists "Client signs plan sets" on project_plan_sets;
create policy "Client signs plan sets" on project_plan_sets
  for update using (public.client_has_project_portal_access(project_id));

-- project_plan_files
drop policy if exists "Client reads plan files" on project_plan_files;
create policy "Client reads plan files" on project_plan_files
  for select using (
    exists (
      select 1 from project_plan_sets ps
      where ps.id = plan_set_id
        and public.client_has_project_portal_access(ps.project_id)
    )
  );

-- project_lot_fit_reviews
drop policy if exists "Client reads own lot fit reviews" on project_lot_fit_reviews;
create policy "Client reads own lot fit reviews" on project_lot_fit_reviews
  for select using (public.client_has_project_portal_access(project_id));

-- storage: project update files
drop policy if exists "Client reads project update files" on storage.objects;
create policy "Client reads project update files" on storage.objects
  for select using (
    bucket_id = 'project-updates'
    and exists (
      select 1
      from project_update_images img
      join project_updates u on u.id = img.update_id
      where img.storage_path = name
        and public.client_has_project_portal_access(u.project_id)
    )
  );

comment on column profiles.portal_active is 'Master switch — when false, client cannot access /client portal';
comment on column projects.client_portal_enabled is 'When true, primary client_id can see this project in the portal';
comment on table project_portal_members is 'Additional portal viewers per project (beyond primary client_id)';
