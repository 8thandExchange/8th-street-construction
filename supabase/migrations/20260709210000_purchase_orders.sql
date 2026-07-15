-- =====================================================================
-- PURCHASE ORDERS — committed costs to subs/vendors, optionally born
-- from an awarded bid. PO numbers are job-prefixed (608-MACON-PO-001).
-- =====================================================================

create table purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  subcontractor_id uuid references subcontractors(id) on delete set null,
  bid_id uuid references bids(id) on delete set null,
  po_number text not null,
  title text not null,
  description text,
  -- draft -> issued -> billed -> closed; cancelled from any state
  status text not null default 'draft',
  issue_date date,
  needed_by date,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchase_orders_project_idx on purchase_orders(project_id, created_at desc);
create index purchase_orders_sub_idx on purchase_orders(subcontractor_id);

create table purchase_order_lines (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_amount numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  cost_division text,
  display_order int not null default 0
);

create index purchase_order_lines_po_idx on purchase_order_lines(purchase_order_id, display_order);

create trigger purchase_orders_updated_at
  before update on purchase_orders
  for each row execute function public.set_updated_at();

alter table purchase_orders enable row level security;
alter table purchase_order_lines enable row level security;

create policy "Admin manages purchase orders" on purchase_orders
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages purchase order lines" on purchase_order_lines
  for all using (public.is_admin()) with check (public.is_admin());
