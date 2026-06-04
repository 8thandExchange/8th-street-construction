set search_path = public, extensions;

-- =====================================================================
-- SCHEDULE — milestone date ranges for Gantt-style view
-- =====================================================================
alter table project_milestones
  add column if not exists scheduled_start date,
  add column if not exists scheduled_end date;

-- =====================================================================
-- SELECTIONS & ALLOWANCES
-- =====================================================================
create type selection_status as enum (
  'pending',
  'client_review',
  'selected',
  'ordered',
  'installed',
  'approved'
);

create type selection_category as enum (
  'exterior',
  'flooring',
  'cabinets',
  'countertops',
  'tile',
  'plumbing_fixtures',
  'lighting',
  'appliances',
  'hardware',
  'paint',
  'other'
);

create table project_selections (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  category selection_category not null default 'other',
  title text not null,
  description text,
  allowance_amount numeric(12, 2),
  selected_amount numeric(12, 2),
  vendor text,
  product_spec text,
  due_date date,
  status selection_status not null default 'pending',
  client_visible boolean not null default true,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_selections_project_idx on project_selections(project_id, due_date);

-- =====================================================================
-- PUNCH LIST
-- =====================================================================
create type punch_status as enum ('open', 'in_progress', 'complete', 'deferred');

create table punch_list_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  location text,
  title text not null,
  description text,
  status punch_status not null default 'open',
  priority task_priority not null default 'normal',
  assigned_trade text,
  due_date date,
  completed_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index punch_list_project_idx on punch_list_items(project_id, status, due_date);

-- =====================================================================
-- BID REQUESTS — status for RFQ lifecycle
-- =====================================================================
alter table bid_requests
  add column if not exists status text not null default 'open';

-- =====================================================================
-- RLS
-- =====================================================================
alter table project_selections enable row level security;
alter table punch_list_items enable row level security;

create policy "Admin manages selections" on project_selections
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads visible selections" on project_selections
  for select using (
    client_visible = true
    and exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

create policy "Client updates own selection status" on project_selections
  for update using (
    client_visible = true
    and exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  ) with check (
    client_visible = true
    and exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

create policy "Admin manages punch list" on punch_list_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client reads punch list" on punch_list_items
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

drop trigger if exists set_updated_at_project_selections on project_selections;
create trigger set_updated_at_project_selections
  before update on project_selections
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_punch_list_items on punch_list_items;
create trigger set_updated_at_punch_list_items
  before update on punch_list_items
  for each row execute function public.set_updated_at();
