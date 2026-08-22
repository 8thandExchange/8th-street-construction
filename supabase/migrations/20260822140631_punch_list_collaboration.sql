create table public.punch_list_comments (
  id uuid primary key default uuid_generate_v4(),
  punch_item_id uuid not null references public.punch_list_items(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index punch_list_comments_item_idx
  on public.punch_list_comments(punch_item_id, created_at);

create table public.punch_list_images (
  id uuid primary key default uuid_generate_v4(),
  punch_item_id uuid not null references public.punch_list_items(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default now()
);

create index punch_list_images_item_idx
  on public.punch_list_images(punch_item_id, created_at);

alter table public.punch_list_comments enable row level security;
alter table public.punch_list_images enable row level security;

create policy "Admin manages punch comments"
on public.punch_list_comments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Client reads accessible punch comments"
on public.punch_list_comments
for select
using (
  exists (
    select 1
    from public.punch_list_items item
    where item.id = punch_item_id
      and public.client_has_project_portal_access(item.project_id)
  )
);

create policy "Admin manages punch images"
on public.punch_list_images
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Client reads accessible punch images"
on public.punch_list_images
for select
using (
  exists (
    select 1
    from public.punch_list_items item
    where item.id = punch_item_id
      and public.client_has_project_portal_access(item.project_id)
  )
);
