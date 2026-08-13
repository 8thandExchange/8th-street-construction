-- =====================================================================
-- PHOTO-VERIFIED CHECKLIST ITEMS on build tasks.
--
-- A playbook task like "Framing inspection passed" is one checkbox; the
-- field reality is a handful of verifiable steps. These items live under
-- a task and can each carry a photo from the field as proof — check it
-- off from a phone by taking the picture. Built for Robby's motion:
-- paper and photographs first, typing second.
-- =====================================================================

create table task_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references profiles(id) on delete set null,
  photo_path text,                        -- project-documents storage path
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_checklist_items_task_idx
  on task_checklist_items(task_id, display_order);

comment on table task_checklist_items is
  'Verifiable steps under a build task, each optionally proven by a
   field photo. The photo is the checkmark.';

alter table task_checklist_items enable row level security;

create policy "Admin manages task checklist items" on task_checklist_items
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists task_checklist_items_updated_at on task_checklist_items;
create trigger task_checklist_items_updated_at
  before update on task_checklist_items
  for each row execute function public.set_updated_at();
