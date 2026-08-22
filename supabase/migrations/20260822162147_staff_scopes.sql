-- =====================================================================
-- STAFF SCOPES.
--
-- Admin remains the login role (is_admin() unchanged). staff_scope
-- narrows what that login can do: full, project manager, superintendent,
-- or accounting. Job ownership uses project_manager_id plus a new
-- superintendent_id.
-- =====================================================================

alter table public.profiles
  add column if not exists staff_scope text not null default 'full'
    check (staff_scope in ('full', 'project_manager', 'superintendent', 'accounting'));

comment on column public.profiles.staff_scope is
  'Narrows an admin login. full keeps unrestricted office access.';

alter table public.projects
  add column if not exists superintendent_id uuid references public.profiles(id) on delete set null;

create index if not exists projects_superintendent_idx on public.projects(superintendent_id);

comment on column public.projects.superintendent_id is
  'Field owner for this job. Used with staff_scope = superintendent.';
