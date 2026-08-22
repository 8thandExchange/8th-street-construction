-- Photos captured while drafting a daily log become permanent field evidence
-- instead of orphaned uploads. Files remain in the existing project-updates
-- bucket; this table binds each object to its dated project record.
create table public.project_daily_log_images (
  id uuid primary key default uuid_generate_v4(),
  daily_log_id uuid not null references public.project_daily_logs(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index project_daily_log_images_log_idx
  on public.project_daily_log_images(daily_log_id, display_order);

alter table public.project_daily_log_images enable row level security;

create policy "Admin manages daily log images"
on public.project_daily_log_images
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Client reads accessible daily log images"
on public.project_daily_log_images
for select
using (
  exists (
    select 1
    from public.project_daily_logs log
    where log.id = daily_log_id
      and public.client_has_project_portal_access(log.project_id)
  )
);

-- The same bucket also stores progress-update photos. Keep one storage policy
-- that recognizes either kind of client-visible evidence.
drop policy if exists "Client reads project update files" on storage.objects;
create policy "Client reads project update files"
on storage.objects
for select
using (
  bucket_id = 'project-updates'
  and (
    exists (
      select 1
      from public.project_update_images image
      join public.project_updates update_record on update_record.id = image.update_id
      where image.storage_path = name
        and public.client_has_project_portal_access(update_record.project_id)
    )
    or exists (
      select 1
      from public.project_daily_log_images image
      join public.project_daily_logs log on log.id = image.daily_log_id
      where image.storage_path = name
        and public.client_has_project_portal_access(log.project_id)
    )
  )
);
