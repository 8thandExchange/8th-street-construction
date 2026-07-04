-- Real selections: the builder posts multiple options (with photos and
-- prices); the client chooses one in the portal. RLS mirrors the parent
-- project_selections policies.

create table selection_options (
  id uuid primary key default uuid_generate_v4(),
  selection_id uuid not null references project_selections(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  price numeric(12, 2),
  vendor text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index selection_options_selection_idx on selection_options(selection_id, display_order);

alter table project_selections
  add column selected_option_id uuid references selection_options(id) on delete set null;

alter table selection_options enable row level security;

create policy "Admin manages selection options" on selection_options
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads visible selection options" on selection_options
  for select using (
    exists (
      select 1
      from project_selections s
      join projects p on p.id = s.project_id
      where s.id = selection_id
        and s.client_visible = true
        and p.client_id = auth.uid()
    )
  );
