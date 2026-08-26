-- Phase 2 re-keying, table group 2 of N: projects and every project-scoped
-- satellite (documents, contracts, media, tasks, logs, selections, plans,
-- meetings, punch lists, bids, volunteers, assistant/workflow event streams).
-- Money tables (invoices, draws, vendor payables, purchase orders, change
-- orders) are deliberately NOT here — they land last, per the rollout plan.
--
-- Pattern per table (proven by group 1, 20260826150035_org_rekey_crm_group):
--   1. org_id -> backfill to the single org -> NOT NULL -> index.
--   2. BEFORE INSERT trigger fills a missing org_id while exactly one org
--      exists and fails loud (too_many_rows) once there are several.
--   3. Admin policies become TO authenticated and org-scoped, with the
--      public.is_admin() bridge fallback (removed at bridge teardown).
--   4. Client/sub/owner policies keep their original access check and gain
--      a BRIDGED org conjunct: the org must match the JWT claim, but a
--      session with no org claim still passes the original check alone.
--      Portal users created before claim plumbing exists at invite time
--      would otherwise be locked out; the claimless arm goes away at
--      bridge teardown with the is_admin() one.
--   5. Public/anon policies (published projects, public images/updates,
--      published volunteer events) are untouched: the marketing site is
--      single-tenant until per-org domains land.
-- ── projects ────────────────────────────────────────────────────────────
alter table public.projects add column org_id uuid references public.organizations(id);
update public.projects set org_id = (select id from public.organizations);
alter table public.projects alter column org_id set not null;
create index idx_projects_org_id on public.projects (org_id);

create trigger projects_default_org
  before insert on public.projects
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages projects" on public.projects;

create policy "Org admin manages projects" on public.projects
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own project" on public.projects;

create policy "Client reads own project" on public.projects
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(id))
  );

-- ── project_portal_members ──────────────────────────────────────────────
alter table public.project_portal_members add column org_id uuid references public.organizations(id);
update public.project_portal_members set org_id = (select id from public.organizations);
alter table public.project_portal_members alter column org_id set not null;
create index idx_project_portal_members_org_id on public.project_portal_members (org_id);

create trigger project_portal_members_default_org
  before insert on public.project_portal_members
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages portal members" on public.project_portal_members;

create policy "Org admin manages portal members" on public.project_portal_members
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own portal memberships" on public.project_portal_members;

create policy "Client reads own portal memberships" on public.project_portal_members
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (profile_id = (select auth.uid()))
  );

-- ── project_documents ───────────────────────────────────────────────────
alter table public.project_documents add column org_id uuid references public.organizations(id);
update public.project_documents set org_id = (select id from public.organizations);
alter table public.project_documents alter column org_id set not null;
create index idx_project_documents_org_id on public.project_documents (org_id);

create trigger project_documents_default_org
  before insert on public.project_documents
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages documents" on public.project_documents;

create policy "Org admin manages documents" on public.project_documents
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own documents" on public.project_documents;

create policy "Client reads own documents" on public.project_documents
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (visibility = 'client'
      and public.client_has_project_portal_access(project_id))
  );

-- ── project_contracts ───────────────────────────────────────────────────
alter table public.project_contracts add column org_id uuid references public.organizations(id);
update public.project_contracts set org_id = (select id from public.organizations);
alter table public.project_contracts alter column org_id set not null;
create index idx_project_contracts_org_id on public.project_contracts (org_id);

create trigger project_contracts_default_org
  before insert on public.project_contracts
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages project contracts" on public.project_contracts;

create policy "Org admin manages project contracts" on public.project_contracts
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Clients read agreements sent for signature" on public.project_contracts;

create policy "Clients read agreements sent for signature" on public.project_contracts
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (status in ('out_for_signature', 'signed')
      and public.client_has_project_portal_access(project_id))
  );

-- ── project_images ──────────────────────────────────────────────────────
alter table public.project_images add column org_id uuid references public.organizations(id);
update public.project_images set org_id = (select id from public.organizations);
alter table public.project_images alter column org_id set not null;
create index idx_project_images_org_id on public.project_images (org_id);

create trigger project_images_default_org
  before insert on public.project_images
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages images" on public.project_images;

create policy "Org admin manages images" on public.project_images
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads project images" on public.project_images;

create policy "Client reads project images" on public.project_images
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (visibility in ('public', 'client_only')
      and public.client_has_project_portal_access(project_id))
  );

-- ── project_updates ─────────────────────────────────────────────────────
alter table public.project_updates add column org_id uuid references public.organizations(id);
update public.project_updates set org_id = (select id from public.organizations);
alter table public.project_updates alter column org_id set not null;
create index idx_project_updates_org_id on public.project_updates (org_id);

create trigger project_updates_default_org
  before insert on public.project_updates
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages updates" on public.project_updates;

create policy "Org admin manages updates" on public.project_updates
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own project updates" on public.project_updates;

create policy "Client reads own project updates" on public.project_updates
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (visibility in ('client', 'public')
      and public.client_has_project_portal_access(project_id))
  );

-- ── project_update_images ───────────────────────────────────────────────
alter table public.project_update_images add column org_id uuid references public.organizations(id);
update public.project_update_images set org_id = (select id from public.organizations);
alter table public.project_update_images alter column org_id set not null;
create index idx_project_update_images_org_id on public.project_update_images (org_id);

create trigger project_update_images_default_org
  before insert on public.project_update_images
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages update images" on public.project_update_images;

create policy "Org admin manages update images" on public.project_update_images
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own update images" on public.project_update_images;

create policy "Client reads own update images" on public.project_update_images
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.project_updates u
      where u.id = project_update_images.update_id
        and public.client_has_project_portal_access(u.project_id)
    ))
  );

-- ── project_milestones ──────────────────────────────────────────────────
alter table public.project_milestones add column org_id uuid references public.organizations(id);
update public.project_milestones set org_id = (select id from public.organizations);
alter table public.project_milestones alter column org_id set not null;
create index idx_project_milestones_org_id on public.project_milestones (org_id);

create trigger project_milestones_default_org
  before insert on public.project_milestones
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages milestones" on public.project_milestones;

create policy "Org admin manages milestones" on public.project_milestones
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own milestones" on public.project_milestones;

create policy "Client reads own milestones" on public.project_milestones
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── project_tasks ───────────────────────────────────────────────────────
alter table public.project_tasks add column org_id uuid references public.organizations(id);
update public.project_tasks set org_id = (select id from public.organizations);
alter table public.project_tasks alter column org_id set not null;
create index idx_project_tasks_org_id on public.project_tasks (org_id);

create trigger project_tasks_default_org
  before insert on public.project_tasks
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages tasks" on public.project_tasks;

create policy "Org admin manages tasks" on public.project_tasks
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own project tasks" on public.project_tasks;

create policy "Client reads own project tasks" on public.project_tasks
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── task_checklist_items ────────────────────────────────────────────────
alter table public.task_checklist_items add column org_id uuid references public.organizations(id);
update public.task_checklist_items set org_id = (select id from public.organizations);
alter table public.task_checklist_items alter column org_id set not null;
create index idx_task_checklist_items_org_id on public.task_checklist_items (org_id);

create trigger task_checklist_items_default_org
  before insert on public.task_checklist_items
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages task checklist items" on public.task_checklist_items;

create policy "Org admin manages task checklist items" on public.task_checklist_items
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── project_daily_logs ──────────────────────────────────────────────────
alter table public.project_daily_logs add column org_id uuid references public.organizations(id);
update public.project_daily_logs set org_id = (select id from public.organizations);
alter table public.project_daily_logs alter column org_id set not null;
create index idx_project_daily_logs_org_id on public.project_daily_logs (org_id);

create trigger project_daily_logs_default_org
  before insert on public.project_daily_logs
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages daily logs" on public.project_daily_logs;

create policy "Org admin manages daily logs" on public.project_daily_logs
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own project daily logs" on public.project_daily_logs;

create policy "Client reads own project daily logs" on public.project_daily_logs
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── project_daily_log_images ────────────────────────────────────────────
alter table public.project_daily_log_images add column org_id uuid references public.organizations(id);
update public.project_daily_log_images set org_id = (select id from public.organizations);
alter table public.project_daily_log_images alter column org_id set not null;
create index idx_project_daily_log_images_org_id on public.project_daily_log_images (org_id);

create trigger project_daily_log_images_default_org
  before insert on public.project_daily_log_images
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages daily log images" on public.project_daily_log_images;

create policy "Org admin manages daily log images" on public.project_daily_log_images
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads accessible daily log images" on public.project_daily_log_images;

create policy "Client reads accessible daily log images" on public.project_daily_log_images
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.project_daily_logs log
      where log.id = project_daily_log_images.daily_log_id
        and public.client_has_project_portal_access(log.project_id)
    ))
  );

-- ── project_messages ────────────────────────────────────────────────────
alter table public.project_messages add column org_id uuid references public.organizations(id);
update public.project_messages set org_id = (select id from public.organizations);
alter table public.project_messages alter column org_id set not null;
create index idx_project_messages_org_id on public.project_messages (org_id);

create trigger project_messages_default_org
  before insert on public.project_messages
  for each row execute function public.fill_default_org_id();
drop policy "Admin reads + writes all messages" on public.project_messages;

create policy "Org admin reads + writes all messages" on public.project_messages
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own project messages" on public.project_messages;

create policy "Client reads own project messages" on public.project_messages
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── project_selections ──────────────────────────────────────────────────
alter table public.project_selections add column org_id uuid references public.organizations(id);
update public.project_selections set org_id = (select id from public.organizations);
alter table public.project_selections alter column org_id set not null;
create index idx_project_selections_org_id on public.project_selections (org_id);

create trigger project_selections_default_org
  before insert on public.project_selections
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages selections" on public.project_selections;

create policy "Org admin manages selections" on public.project_selections
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads visible selections" on public.project_selections;

create policy "Client reads visible selections" on public.project_selections
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (client_visible = true
      and public.client_has_project_portal_access(project_id))
  );

drop policy "Client updates own selection status" on public.project_selections;

create policy "Client updates own selection status" on public.project_selections
  for update to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (client_visible = true
      and public.client_has_project_portal_access(project_id))
  );

-- ── selection_options ───────────────────────────────────────────────────
alter table public.selection_options add column org_id uuid references public.organizations(id);
update public.selection_options set org_id = (select id from public.organizations);
alter table public.selection_options alter column org_id set not null;
create index idx_selection_options_org_id on public.selection_options (org_id);

create trigger selection_options_default_org
  before insert on public.selection_options
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages selection options" on public.selection_options;

create policy "Org admin manages selection options" on public.selection_options
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads visible selection options" on public.selection_options;

create policy "Client reads visible selection options" on public.selection_options
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1
      from public.project_selections s
      join public.projects p on p.id = s.project_id
      where s.id = selection_options.selection_id
        and s.client_visible = true
        and p.client_id = (select auth.uid())
    ))
  );

-- ── project_rfis ────────────────────────────────────────────────────────
alter table public.project_rfis add column org_id uuid references public.organizations(id);
update public.project_rfis set org_id = (select id from public.organizations);
alter table public.project_rfis alter column org_id set not null;
create index idx_project_rfis_org_id on public.project_rfis (org_id);

create trigger project_rfis_default_org
  before insert on public.project_rfis
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages RFIs" on public.project_rfis;

create policy "Org admin manages RFIs" on public.project_rfis
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Clients read sent RFIs" on public.project_rfis;

create policy "Clients read sent RFIs" on public.project_rfis
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (status in ('open', 'answered', 'closed')
      and public.client_has_project_portal_access(project_id))
  );

-- ── project_submittals ──────────────────────────────────────────────────
alter table public.project_submittals add column org_id uuid references public.organizations(id);
update public.project_submittals set org_id = (select id from public.organizations);
alter table public.project_submittals alter column org_id set not null;
create index idx_project_submittals_org_id on public.project_submittals (org_id);

create trigger project_submittals_default_org
  before insert on public.project_submittals
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages submittals" on public.project_submittals;

create policy "Org admin manages submittals" on public.project_submittals
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── project_proposals ───────────────────────────────────────────────────
alter table public.project_proposals add column org_id uuid references public.organizations(id);
update public.project_proposals set org_id = (select id from public.organizations);
alter table public.project_proposals alter column org_id set not null;
create index idx_project_proposals_org_id on public.project_proposals (org_id);

create trigger project_proposals_default_org
  before insert on public.project_proposals
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages proposals" on public.project_proposals;

create policy "Org admin manages proposals" on public.project_proposals
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads sent project proposals" on public.project_proposals;

create policy "Client reads sent project proposals" on public.project_proposals
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (status <> 'draft'
      and public.client_has_project_portal_access(project_id))
  );

-- ── project_plan_sets ───────────────────────────────────────────────────
alter table public.project_plan_sets add column org_id uuid references public.organizations(id);
update public.project_plan_sets set org_id = (select id from public.organizations);
alter table public.project_plan_sets alter column org_id set not null;
create index idx_project_plan_sets_org_id on public.project_plan_sets (org_id);

create trigger project_plan_sets_default_org
  before insert on public.project_plan_sets
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages plan sets" on public.project_plan_sets;

create policy "Org admin manages plan sets" on public.project_plan_sets
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own plan sets" on public.project_plan_sets;

create policy "Client reads own plan sets" on public.project_plan_sets
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

drop policy "Client signs plan sets" on public.project_plan_sets;

create policy "Client signs plan sets" on public.project_plan_sets
  for update to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── project_plan_files ──────────────────────────────────────────────────
alter table public.project_plan_files add column org_id uuid references public.organizations(id);
update public.project_plan_files set org_id = (select id from public.organizations);
alter table public.project_plan_files alter column org_id set not null;
create index idx_project_plan_files_org_id on public.project_plan_files (org_id);

create trigger project_plan_files_default_org
  before insert on public.project_plan_files
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages plan files" on public.project_plan_files;

create policy "Org admin manages plan files" on public.project_plan_files
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads plan files" on public.project_plan_files;

create policy "Client reads plan files" on public.project_plan_files
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.project_plan_sets ps
      where ps.id = project_plan_files.plan_set_id
        and public.client_has_project_portal_access(ps.project_id)
    ))
  );

-- ── project_lot_fit_reviews ─────────────────────────────────────────────
alter table public.project_lot_fit_reviews add column org_id uuid references public.organizations(id);
update public.project_lot_fit_reviews set org_id = (select id from public.organizations);
alter table public.project_lot_fit_reviews alter column org_id set not null;
create index idx_project_lot_fit_reviews_org_id on public.project_lot_fit_reviews (org_id);

create trigger project_lot_fit_reviews_default_org
  before insert on public.project_lot_fit_reviews
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages lot fit reviews" on public.project_lot_fit_reviews;

create policy "Org admin manages lot fit reviews" on public.project_lot_fit_reviews
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own lot fit reviews" on public.project_lot_fit_reviews;

create policy "Client reads own lot fit reviews" on public.project_lot_fit_reviews
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── project_inspections ─────────────────────────────────────────────────
alter table public.project_inspections add column org_id uuid references public.organizations(id);
update public.project_inspections set org_id = (select id from public.organizations);
alter table public.project_inspections alter column org_id set not null;
create index idx_project_inspections_org_id on public.project_inspections (org_id);

create trigger project_inspections_default_org
  before insert on public.project_inspections
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages inspections" on public.project_inspections;

create policy "Org admin manages inspections" on public.project_inspections
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── project_service_requests ────────────────────────────────────────────
alter table public.project_service_requests add column org_id uuid references public.organizations(id);
update public.project_service_requests set org_id = (select id from public.organizations);
alter table public.project_service_requests alter column org_id set not null;
create index idx_project_service_requests_org_id on public.project_service_requests (org_id);

create trigger project_service_requests_default_org
  before insert on public.project_service_requests
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages service requests" on public.project_service_requests;

create policy "Org admin manages service requests" on public.project_service_requests
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Clients read sent service requests" on public.project_service_requests;

create policy "Clients read sent service requests" on public.project_service_requests
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (status <> 'draft'
      and public.client_has_project_portal_access(project_id))
  );

-- ── project_service_images ──────────────────────────────────────────────
alter table public.project_service_images add column org_id uuid references public.organizations(id);
update public.project_service_images set org_id = (select id from public.organizations);
alter table public.project_service_images alter column org_id set not null;
create index idx_project_service_images_org_id on public.project_service_images (org_id);

create trigger project_service_images_default_org
  before insert on public.project_service_images
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages service images" on public.project_service_images;

create policy "Org admin manages service images" on public.project_service_images
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Clients read accessible service images" on public.project_service_images;

create policy "Clients read accessible service images" on public.project_service_images
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.project_service_requests req
      where req.id = project_service_images.request_id
        and req.status <> 'draft'
        and public.client_has_project_portal_access(req.project_id)
    ))
  );

-- ── project_estimate_lines ──────────────────────────────────────────────
alter table public.project_estimate_lines add column org_id uuid references public.organizations(id);
update public.project_estimate_lines set org_id = (select id from public.organizations);
alter table public.project_estimate_lines alter column org_id set not null;
create index idx_project_estimate_lines_org_id on public.project_estimate_lines (org_id);

create trigger project_estimate_lines_default_org
  before insert on public.project_estimate_lines
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages estimate lines" on public.project_estimate_lines;

create policy "Org admin manages estimate lines" on public.project_estimate_lines
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── project_takeoff_values ──────────────────────────────────────────────
alter table public.project_takeoff_values add column org_id uuid references public.organizations(id);
update public.project_takeoff_values set org_id = (select id from public.organizations);
alter table public.project_takeoff_values alter column org_id set not null;
create index idx_project_takeoff_values_org_id on public.project_takeoff_values (org_id);

create trigger project_takeoff_values_default_org
  before insert on public.project_takeoff_values
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages project takeoff" on public.project_takeoff_values;

create policy "Org admin manages project takeoff" on public.project_takeoff_values
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── project_cost_snapshots ──────────────────────────────────────────────
alter table public.project_cost_snapshots add column org_id uuid references public.organizations(id);
update public.project_cost_snapshots set org_id = (select id from public.organizations);
alter table public.project_cost_snapshots alter column org_id set not null;
create index idx_project_cost_snapshots_org_id on public.project_cost_snapshots (org_id);

create trigger project_cost_snapshots_default_org
  before insert on public.project_cost_snapshots
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages cost snapshots" on public.project_cost_snapshots;

create policy "Org admin manages cost snapshots" on public.project_cost_snapshots
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── project_crew_weeks ──────────────────────────────────────────────────
alter table public.project_crew_weeks add column org_id uuid references public.organizations(id);
update public.project_crew_weeks set org_id = (select id from public.organizations);
alter table public.project_crew_weeks alter column org_id set not null;
create index idx_project_crew_weeks_org_id on public.project_crew_weeks (org_id);

create trigger project_crew_weeks_default_org
  before insert on public.project_crew_weeks
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages crew weeks" on public.project_crew_weeks;

create policy "Org admin manages crew weeks" on public.project_crew_weeks
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── project_reminder_log ────────────────────────────────────────────────
alter table public.project_reminder_log add column org_id uuid references public.organizations(id);
update public.project_reminder_log set org_id = (select id from public.organizations);
alter table public.project_reminder_log alter column org_id set not null;
create index idx_project_reminder_log_org_id on public.project_reminder_log (org_id);

create trigger project_reminder_log_default_org
  before insert on public.project_reminder_log
  for each row execute function public.fill_default_org_id();
drop policy "Admin reads project reminder log" on public.project_reminder_log;

create policy "Org admin reads project reminder log" on public.project_reminder_log
  for select to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── punch_list_items ────────────────────────────────────────────────────
alter table public.punch_list_items add column org_id uuid references public.organizations(id);
update public.punch_list_items set org_id = (select id from public.organizations);
alter table public.punch_list_items alter column org_id set not null;
create index idx_punch_list_items_org_id on public.punch_list_items (org_id);

create trigger punch_list_items_default_org
  before insert on public.punch_list_items
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages punch list" on public.punch_list_items;

create policy "Org admin manages punch list" on public.punch_list_items
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads punch list" on public.punch_list_items;

create policy "Client reads punch list" on public.punch_list_items
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── punch_list_comments ─────────────────────────────────────────────────
alter table public.punch_list_comments add column org_id uuid references public.organizations(id);
update public.punch_list_comments set org_id = (select id from public.organizations);
alter table public.punch_list_comments alter column org_id set not null;
create index idx_punch_list_comments_org_id on public.punch_list_comments (org_id);

create trigger punch_list_comments_default_org
  before insert on public.punch_list_comments
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages punch comments" on public.punch_list_comments;

create policy "Org admin manages punch comments" on public.punch_list_comments
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads accessible punch comments" on public.punch_list_comments;

create policy "Client reads accessible punch comments" on public.punch_list_comments
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.punch_list_items item
      where item.id = punch_list_comments.punch_item_id
        and public.client_has_project_portal_access(item.project_id)
    ))
  );

-- ── punch_list_images ───────────────────────────────────────────────────
alter table public.punch_list_images add column org_id uuid references public.organizations(id);
update public.punch_list_images set org_id = (select id from public.organizations);
alter table public.punch_list_images alter column org_id set not null;
create index idx_punch_list_images_org_id on public.punch_list_images (org_id);

create trigger punch_list_images_default_org
  before insert on public.punch_list_images
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages punch images" on public.punch_list_images;

create policy "Org admin manages punch images" on public.punch_list_images
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads accessible punch images" on public.punch_list_images;

create policy "Client reads accessible punch images" on public.punch_list_images
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.punch_list_items item
      where item.id = punch_list_images.punch_item_id
        and public.client_has_project_portal_access(item.project_id)
    ))
  );

-- ── meetings ────────────────────────────────────────────────────────────
-- The approved-minutes guards block UPDATEs to locked meetings and their
-- children; the org_id backfill is structural, not a minutes edit, so the
-- guards are suspended for exactly these statements.
alter table public.meetings add column org_id uuid references public.organizations(id);
alter table public.meetings disable trigger meetings_guard_approved;
update public.meetings set org_id = (select id from public.organizations);
alter table public.meetings enable trigger meetings_guard_approved;
alter table public.meetings alter column org_id set not null;
create index idx_meetings_org_id on public.meetings (org_id);

create trigger meetings_default_org
  before insert on public.meetings
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages meetings" on public.meetings;

create policy "Org admin manages meetings" on public.meetings
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── meeting_series ──────────────────────────────────────────────────────
alter table public.meeting_series add column org_id uuid references public.organizations(id);
update public.meeting_series set org_id = (select id from public.organizations);
alter table public.meeting_series alter column org_id set not null;
create index idx_meeting_series_org_id on public.meeting_series (org_id);

create trigger meeting_series_default_org
  before insert on public.meeting_series
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages meeting series" on public.meeting_series;

create policy "Org admin manages meeting series" on public.meeting_series
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── meeting_attendees ───────────────────────────────────────────────────
alter table public.meeting_attendees add column org_id uuid references public.organizations(id);
update public.meeting_attendees set org_id = (select id from public.organizations);
alter table public.meeting_attendees alter column org_id set not null;
create index idx_meeting_attendees_org_id on public.meeting_attendees (org_id);

create trigger meeting_attendees_default_org
  before insert on public.meeting_attendees
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages meeting attendees" on public.meeting_attendees;

create policy "Org admin manages meeting attendees" on public.meeting_attendees
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── meeting_agenda_items ────────────────────────────────────────────────
alter table public.meeting_agenda_items add column org_id uuid references public.organizations(id);
alter table public.meeting_agenda_items disable trigger agenda_items_guard_approved;
update public.meeting_agenda_items set org_id = (select id from public.organizations);
alter table public.meeting_agenda_items enable trigger agenda_items_guard_approved;
alter table public.meeting_agenda_items alter column org_id set not null;
create index idx_meeting_agenda_items_org_id on public.meeting_agenda_items (org_id);

create trigger meeting_agenda_items_default_org
  before insert on public.meeting_agenda_items
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages agenda items" on public.meeting_agenda_items;

create policy "Org admin manages agenda items" on public.meeting_agenda_items
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── meeting_decisions ───────────────────────────────────────────────────
alter table public.meeting_decisions add column org_id uuid references public.organizations(id);
alter table public.meeting_decisions disable trigger decisions_guard_approved;
update public.meeting_decisions set org_id = (select id from public.organizations);
alter table public.meeting_decisions enable trigger decisions_guard_approved;
alter table public.meeting_decisions alter column org_id set not null;
create index idx_meeting_decisions_org_id on public.meeting_decisions (org_id);

create trigger meeting_decisions_default_org
  before insert on public.meeting_decisions
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages decisions" on public.meeting_decisions;

create policy "Org admin manages decisions" on public.meeting_decisions
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── meeting_action_items ────────────────────────────────────────────────
alter table public.meeting_action_items add column org_id uuid references public.organizations(id);
update public.meeting_action_items set org_id = (select id from public.organizations);
alter table public.meeting_action_items alter column org_id set not null;
create index idx_meeting_action_items_org_id on public.meeting_action_items (org_id);

create trigger meeting_action_items_default_org
  before insert on public.meeting_action_items
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages action items" on public.meeting_action_items;

create policy "Org admin manages action items" on public.meeting_action_items
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── meeting_action_updates ──────────────────────────────────────────────
alter table public.meeting_action_updates add column org_id uuid references public.organizations(id);
update public.meeting_action_updates set org_id = (select id from public.organizations);
alter table public.meeting_action_updates alter column org_id set not null;
create index idx_meeting_action_updates_org_id on public.meeting_action_updates (org_id);

create trigger meeting_action_updates_default_org
  before insert on public.meeting_action_updates
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages action updates" on public.meeting_action_updates;

create policy "Org admin manages action updates" on public.meeting_action_updates
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── meeting_nudge_log ───────────────────────────────────────────────────
alter table public.meeting_nudge_log add column org_id uuid references public.organizations(id);
update public.meeting_nudge_log set org_id = (select id from public.organizations);
alter table public.meeting_nudge_log alter column org_id set not null;
create index idx_meeting_nudge_log_org_id on public.meeting_nudge_log (org_id);

create trigger meeting_nudge_log_default_org
  before insert on public.meeting_nudge_log
  for each row execute function public.fill_default_org_id();
drop policy "Admin reads nudge log" on public.meeting_nudge_log;

create policy "Org admin reads nudge log" on public.meeting_nudge_log
  for select to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── volunteer_events ────────────────────────────────────────────────────
alter table public.volunteer_events add column org_id uuid references public.organizations(id);
update public.volunteer_events set org_id = (select id from public.organizations);
alter table public.volunteer_events alter column org_id set not null;
create index idx_volunteer_events_org_id on public.volunteer_events (org_id);

create trigger volunteer_events_default_org
  before insert on public.volunteer_events
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages volunteer events" on public.volunteer_events;

create policy "Org admin manages volunteer events" on public.volunteer_events
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── volunteer_signups ───────────────────────────────────────────────────
alter table public.volunteer_signups add column org_id uuid references public.organizations(id);
update public.volunteer_signups set org_id = (select id from public.organizations);
alter table public.volunteer_signups alter column org_id set not null;
create index idx_volunteer_signups_org_id on public.volunteer_signups (org_id);

create trigger volunteer_signups_default_org
  before insert on public.volunteer_signups
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages volunteer signups" on public.volunteer_signups;

create policy "Org admin manages volunteer signups" on public.volunteer_signups
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── bid_requests ────────────────────────────────────────────────────────
alter table public.bid_requests add column org_id uuid references public.organizations(id);
update public.bid_requests set org_id = (select id from public.organizations);
alter table public.bid_requests alter column org_id set not null;
create index idx_bid_requests_org_id on public.bid_requests (org_id);

create trigger bid_requests_default_org
  before insert on public.bid_requests
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages bid requests" on public.bid_requests;

create policy "Org admin manages bid requests" on public.bid_requests
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Sub reads invited bid requests" on public.bid_requests;

create policy "Sub reads invited bid requests" on public.bid_requests
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1
      from public.bids b
      join public.subcontractors s on s.id = b.subcontractor_id
      where b.bid_request_id = bid_requests.id
        and s.profile_id = (select auth.uid())
    ))
  );

-- ── bid_request_reviews ─────────────────────────────────────────────────
alter table public.bid_request_reviews add column org_id uuid references public.organizations(id);
update public.bid_request_reviews set org_id = (select id from public.organizations);
alter table public.bid_request_reviews alter column org_id set not null;
create index idx_bid_request_reviews_org_id on public.bid_request_reviews (org_id);

create trigger bid_request_reviews_default_org
  before insert on public.bid_request_reviews
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages bid request reviews" on public.bid_request_reviews;

create policy "Org admin manages bid request reviews" on public.bid_request_reviews
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── bids ────────────────────────────────────────────────────────────────
alter table public.bids add column org_id uuid references public.organizations(id);
update public.bids set org_id = (select id from public.organizations);
alter table public.bids alter column org_id set not null;
create index idx_bids_org_id on public.bids (org_id);

create trigger bids_default_org
  before insert on public.bids
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages bids" on public.bids;

create policy "Org admin manages bids" on public.bids
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Sub reads own bids" on public.bids;

create policy "Sub reads own bids" on public.bids
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.subcontractors s
      where s.id = bids.subcontractor_id
        and s.profile_id = (select auth.uid())
    ))
  );

-- ── assistant_conversations ─────────────────────────────────────────────
alter table public.assistant_conversations add column org_id uuid references public.organizations(id);
update public.assistant_conversations set org_id = (select id from public.organizations);
alter table public.assistant_conversations alter column org_id set not null;
create index idx_assistant_conversations_org_id on public.assistant_conversations (org_id);

create trigger assistant_conversations_default_org
  before insert on public.assistant_conversations
  for each row execute function public.fill_default_org_id();

drop policy "Owner reads own assistant conversations" on public.assistant_conversations;

create policy "Owner reads own assistant conversations" on public.assistant_conversations
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (user_id = (select auth.uid())
      and deleted_at is null)
  );

-- ── assistant_audit_events ──────────────────────────────────────────────
alter table public.assistant_audit_events add column org_id uuid references public.organizations(id);
update public.assistant_audit_events set org_id = (select id from public.organizations);
alter table public.assistant_audit_events alter column org_id set not null;
create index idx_assistant_audit_events_org_id on public.assistant_audit_events (org_id);

create trigger assistant_audit_events_default_org
  before insert on public.assistant_audit_events
  for each row execute function public.fill_default_org_id();
drop policy "Admin reads assistant audit events" on public.assistant_audit_events;

create policy "Org admin reads assistant audit events" on public.assistant_audit_events
  for select to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── workflow_events ─────────────────────────────────────────────────────
alter table public.workflow_events add column org_id uuid references public.organizations(id);
update public.workflow_events set org_id = (select id from public.organizations);
alter table public.workflow_events alter column org_id set not null;
create index idx_workflow_events_org_id on public.workflow_events (org_id);

create trigger workflow_events_default_org
  before insert on public.workflow_events
  for each row execute function public.fill_default_org_id();
drop policy "Admin reads workflow events" on public.workflow_events;

create policy "Org admin reads workflow events" on public.workflow_events
  for select to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );


