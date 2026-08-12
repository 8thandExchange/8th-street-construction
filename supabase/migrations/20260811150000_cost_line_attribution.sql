set search_path = public, extensions;

-- =====================================================================
-- COMMITTED / ACTUAL / BILLED ATTRIBUTION (Phase B of COST_PLAN_SPEC.md)
--
-- The spreadsheet has Budget and Actual and nothing in between, so money
-- disappears from view between the day a quote is accepted and the day the
-- invoice arrives. These links close that gap:
--
--   Committed = issued PO lines pointing at a cost line
--   Actual    = vendor bill amounts allocated to a cost line
--   Billed    = invoice lines pointing at a cost line
--
-- None of it is stored as a column on the cost line. It is derived in
-- project_cost_line_rollup, because a cached rollup is exactly what rotted
-- the sheet's Over/Under column.
--
-- Note this is orthogonal to city budget lines. A Habitat invoice line carries
-- BOTH: city_budget_line_id says which numbered city line pays for it,
-- estimate_line_id says which of our cost codes it was spent on.
-- =====================================================================

alter table purchase_order_lines
  add column if not exists estimate_line_id uuid
    references project_estimate_lines(id) on delete set null;

create index if not exists purchase_order_lines_estimate_line_idx
  on purchase_order_lines(estimate_line_id) where estimate_line_id is not null;

comment on column purchase_order_lines.estimate_line_id is
  'Cost line this PO line commits against. cost_division is kept for the older
   CSI rollup and is backfilled from the linked line.';

alter table invoice_line_items
  add column if not exists estimate_line_id uuid
    references project_estimate_lines(id) on delete set null;

create index if not exists invoice_line_items_estimate_line_idx
  on invoice_line_items(estimate_line_id) where estimate_line_id is not null;

comment on column invoice_line_items.estimate_line_id is
  'Cost line this billing line draws down. Independent of city_budget_line_id —
   one says what we spent it on, the other says which city line pays.';

-- ---------------------------------------------------------------------
-- Vendor bill allocation. One bill often spans several codes (a lumber
-- invoice covering framing and trim), so this is a join table rather than a
-- single FK on vendor_bills.
--
-- Deliberately NOT constrained to sum to the bill total: a trigger enforcing
-- that would reject every partially-coded bill mid-entry. The UI surfaces the
-- unallocated remainder instead.
-- ---------------------------------------------------------------------

create table if not exists vendor_bill_allocations (
  id uuid primary key default uuid_generate_v4(),
  vendor_bill_id uuid not null references vendor_bills(id) on delete cascade,
  estimate_line_id uuid not null references project_estimate_lines(id) on delete cascade,
  amount numeric(12, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_bill_id, estimate_line_id)
);

create index if not exists vendor_bill_allocations_bill_idx
  on vendor_bill_allocations(vendor_bill_id);
create index if not exists vendor_bill_allocations_line_idx
  on vendor_bill_allocations(estimate_line_id);

comment on table vendor_bill_allocations is
  'Splits a vendor bill across cost codes. Sum may be less than the bill total
   while coding is in progress; the difference shows as unallocated.';

alter table vendor_bill_allocations enable row level security;

drop policy if exists "Admin manages vendor bill allocations" on vendor_bill_allocations;
create policy "Admin manages vendor bill allocations" on vendor_bill_allocations
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists vendor_bill_allocations_updated_at on vendor_bill_allocations;
create trigger vendor_bill_allocations_updated_at
  before update on vendor_bill_allocations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- The rollup
-- ---------------------------------------------------------------------

create or replace view project_cost_line_rollup
with (security_invoker = true) as
select
  l.id,
  l.project_id,
  l.code,
  l.section,
  l.trade_label,
  l.line_type,
  l.estimated_amount                                   as budget,
  coalesce(po.committed, 0)                            as committed,
  coalesce(vb.actual, 0)                               as actual,
  coalesce(inv.billed, 0)                              as billed,
  coalesce(po.po_count, 0)                             as po_count,
  coalesce(vb.bill_count, 0)                           as bill_count,
  coalesce(inv.invoice_count, 0)                       as invoice_count,
  -- An unstarted line has its whole budget left. Committed and actual overlap
  -- once a PO gets billed, so the larger of the two is what the line has
  -- consumed — never their sum.
  l.estimated_amount
    - greatest(coalesce(po.committed, 0), coalesce(vb.actual, 0)) as remaining
from project_estimate_lines l
left join lateral (
  select sum(pol.amount) as committed, count(distinct p.id) as po_count
  from purchase_order_lines pol
  join purchase_orders p on p.id = pol.purchase_order_id
  where pol.estimate_line_id = l.id
    and p.status in ('issued', 'billed', 'closed')
) po on true
left join lateral (
  select sum(a.amount) as actual, count(*) as bill_count
  from vendor_bill_allocations a
  join vendor_bills b on b.id = a.vendor_bill_id
  where a.estimate_line_id = l.id
    and b.status <> 'void'
) vb on true
left join lateral (
  select sum(ili.amount) as billed, count(distinct i.id) as invoice_count
  from invoice_line_items ili
  join invoices i on i.id = ili.invoice_id
  where ili.estimate_line_id = l.id
    and i.status not in ('draft', 'void')
) inv on true;

comment on view project_cost_line_rollup is
  'Budget vs committed vs actual vs billed per cost line. Derived, never
   cached — the spreadsheet cached this and it went stale.';

-- Keep the legacy CSI column in step when a PO line is attributed.
create or replace function public.sync_po_line_cost_division()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.estimate_line_id is not null then
    select division_code into new.cost_division
    from project_estimate_lines where id = new.estimate_line_id;
  end if;
  return new;
end;
$$;

drop trigger if exists purchase_order_lines_sync_division on purchase_order_lines;
create trigger purchase_order_lines_sync_division
  before insert or update of estimate_line_id on purchase_order_lines
  for each row execute function public.sync_po_line_cost_division();
