set search_path = public, extensions;

alter table project_tasks
  add column if not exists is_custom boolean not null default false;

create index if not exists project_tasks_custom_idx
  on project_tasks(project_id, is_custom)
  where is_custom = true;

comment on column project_tasks.is_custom is 'True when added manually for this job; false when seeded from playbook';
