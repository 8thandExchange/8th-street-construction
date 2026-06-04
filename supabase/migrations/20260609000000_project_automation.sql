set search_path = public, extensions;

create table project_reminder_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  reminder_key text not null,
  entity_type text not null,
  entity_id uuid,
  sent_to text not null,
  sent_at timestamptz not null default now()
);

create index project_reminder_dedupe_idx
  on project_reminder_log(reminder_key, entity_id, sent_at desc);

alter table project_reminder_log enable row level security;

create policy "Admin reads project reminder log" on project_reminder_log
  for select using (public.is_admin());
