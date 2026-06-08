set search_path = public, extensions;

-- =====================================================================
-- HOUSE BASE PLANS — Craig Peel catalog + lot fit review workflow
-- =====================================================================

create table house_base_plans (
  id uuid primary key default uuid_generate_v4(),
  plan_number text not null,
  name text not null,
  designer text not null default 'Craig Peel',
  variant text,
  sheet_count int,
  storage_path text not null,
  file_type text not null default 'application/pdf',
  file_size_bytes bigint,
  square_footage int,
  bedrooms int,
  bathrooms numeric(3, 1),
  stories int,
  notes text,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_number, variant)
);

create index house_base_plans_active_idx on house_base_plans(active, display_order);
create index house_base_plans_number_idx on house_base_plans(plan_number);

alter table projects
  add column if not exists base_plan_id uuid references house_base_plans(id) on delete set null,
  add column if not exists lot_number text,
  add column if not exists subdivision text,
  add column if not exists plat_storage_path text;

create index projects_base_plan_idx on projects(base_plan_id) where base_plan_id is not null;

create type lot_fit_review_status as enum (
  'pending',
  'in_review',
  'revisions_needed',
  'approved'
);

create table project_lot_fit_reviews (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  base_plan_id uuid references house_base_plans(id) on delete set null,
  plat_storage_path text,
  status lot_fit_review_status not null default 'pending',
  critique_summary text,
  critique_items jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_lot_fit_reviews_project_idx
  on project_lot_fit_reviews(project_id, created_at desc);

-- =====================================================================
-- RLS
-- =====================================================================
alter table house_base_plans enable row level security;
alter table project_lot_fit_reviews enable row level security;

create policy "Admin manages base plans" on house_base_plans
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated reads active base plans" on house_base_plans
  for select using (active = true and auth.uid() is not null);

create policy "Admin manages lot fit reviews" on project_lot_fit_reviews
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads own lot fit reviews" on project_lot_fit_reviews
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

drop trigger if exists set_updated_at_house_base_plans on house_base_plans;
create trigger set_updated_at_house_base_plans
  before update on house_base_plans
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_lot_fit_reviews on project_lot_fit_reviews;
create trigger set_updated_at_project_lot_fit_reviews
  before update on project_lot_fit_reviews
  for each row execute function public.set_updated_at();

comment on table house_base_plans is 'Company catalog of Craig Peel base house plans — each lot gets revisions from these.';
comment on table project_lot_fit_reviews is 'Plat + house fit analysis and revision notes per lot/project.';
