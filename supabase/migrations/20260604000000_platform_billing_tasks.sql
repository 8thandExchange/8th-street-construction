-- Phase 2B + 4 foundation: tasks, invoices, draws, Stripe bookkeeping
-- Run after 20260515000000_initial_schema.sql

set search_path = public, extensions;

-- =====================================================================
-- ENUMS
-- =====================================================================
create type task_status as enum (
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create type task_priority as enum ('low', 'normal', 'high', 'urgent');

create type invoice_status as enum (
  'draft',
  'sent',
  'viewed',
  'paid',
  'partial',
  'overdue',
  'void'
);

create type draw_status as enum (
  'scheduled',
  'invoiced',
  'paid',
  'skipped',
  'cancelled'
);

-- =====================================================================
-- PROJECT TASKS — internal PM / punch-list precursor
-- =====================================================================
create table project_tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid references project_milestones(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'normal',
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  display_order int not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_tasks_project_idx on project_tasks(project_id, status, display_order);
create index project_tasks_assignee_idx on project_tasks(assignee_id) where assignee_id is not null;

-- =====================================================================
-- STRIPE CUSTOMERS — one per client profile (or per project if needed later)
-- =====================================================================
create table stripe_customers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  email citext,
  created_at timestamptz not null default now(),
  unique(profile_id)
);

-- =====================================================================
-- INVOICES
-- =====================================================================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  client_id uuid references profiles(id) on delete set null,
  invoice_number text not null,
  status invoice_status not null default 'draft',
  title text,
  notes text,
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  currency text not null default 'usd',
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  stripe_invoice_id text unique,
  stripe_hosted_invoice_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, invoice_number)
);

create index invoices_project_idx on invoices(project_id, created_at desc);
create index invoices_status_idx on invoices(status);

create table invoice_line_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_amount numeric(12, 2) not null,
  amount numeric(12, 2) not null,
  display_order int not null default 0,
  change_order_id uuid references change_orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create index invoice_line_items_invoice_idx on invoice_line_items(invoice_id, display_order);

-- =====================================================================
-- PAYMENT DRAWS — construction draw schedule
-- =====================================================================
create table payment_draws (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid references project_milestones(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  draw_number int not null,
  title text not null,
  description text,
  amount numeric(12, 2) not null,
  percent_of_contract numeric(5, 2),
  status draw_status not null default 'scheduled',
  scheduled_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, draw_number)
);

create index payment_draws_project_idx on payment_draws(project_id, draw_number);

-- =====================================================================
-- STRIPE WEBHOOK IDEMPOTENCY
-- =====================================================================
create table stripe_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

-- =====================================================================
-- RLS
-- =====================================================================
alter table project_tasks enable row level security;
alter table stripe_customers enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table payment_draws enable row level security;
alter table stripe_webhook_events enable row level security;

-- Tasks: admin full; client read-only on their project (optional visibility later)
create policy "Admin manages tasks" on project_tasks
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own project tasks" on project_tasks
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- Stripe customers: admin + own profile read
create policy "Admin manages stripe customers" on stripe_customers
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Own stripe customer read" on stripe_customers
  for select using (profile_id = auth.uid());

-- Invoices
create policy "Admin manages invoices" on invoices
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own invoices" on invoices
  for select using (client_id = auth.uid());
create policy "Client reads project invoices" on invoices
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

create policy "Admin manages line items" on invoice_line_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own line items" on invoice_line_items
  for select using (
    exists (
      select 1 from invoices i
      where i.id = invoice_id
        and (i.client_id = auth.uid() or exists (
          select 1 from projects p where p.id = i.project_id and p.client_id = auth.uid()
        ))
    )
  );

-- Draws
create policy "Admin manages draws" on payment_draws
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own draws" on payment_draws
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- Webhooks: service role only (no client policies)
create policy "Admin reads webhook events" on stripe_webhook_events
  for select using (public.is_admin());

-- updated_at triggers (reuse existing function)
do $$
declare t text;
begin
  foreach t in array array['project_tasks', 'invoices', 'payment_draws']
  loop
    execute format(
      'drop trigger if exists set_updated_at_%I on %I; create trigger set_updated_at_%I before update on %I for each row execute function set_updated_at();',
      t, t, t, t
    );
  end loop;
end;
$$;
