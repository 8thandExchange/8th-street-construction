-- Build playbook metadata on projects, milestones, and tasks

set search_path = public, extensions;

alter table projects
  add column if not exists street_address text,
  add column if not exists jurisdiction text,
  add column if not exists playbook_id text,
  add column if not exists playbook_applied_at timestamptz;

alter table project_milestones
  add column if not exists phase_key text,
  add column if not exists started_at timestamptz;

create index if not exists project_milestones_phase_idx
  on project_milestones(project_id, phase_key);

alter table project_tasks
  add column if not exists phase_key text;

create index if not exists project_tasks_phase_idx
  on project_tasks(project_id, phase_key, display_order);

-- started_at helper for milestones (optional backfill from in_progress status)
comment on column projects.playbook_id is 'e.g. ga-residential-v1 — template used to seed milestones/tasks';
comment on column project_milestones.phase_key is 'Playbook phase identifier for grouping';
comment on column project_tasks.phase_key is 'Playbook phase identifier for grouping';
