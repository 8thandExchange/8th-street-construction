-- First-party workflow measurement. Starts, completions, and abandonments
-- are written by authenticated server actions only.

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  role text,
  workflow text not null,
  event text not null check (event in ('start', 'complete', 'abandon')),
  entity_id text,
  project_id uuid references public.projects(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index workflow_events_workflow_idx
  on public.workflow_events (workflow, created_at desc);

create index workflow_events_project_idx
  on public.workflow_events (project_id, created_at desc)
  where project_id is not null;

alter table public.workflow_events enable row level security;

create policy "Admin reads workflow events"
on public.workflow_events
for select
using (public.is_admin());
