-- =====================================================================
-- CHANGE ORDERS REACH THE BUDGET.
--
-- change_orders carried cost_impact and schedule_impact_days but had no
-- link to project_estimate_lines, so an approved CO never moved the
-- budget grid — "original vs revised vs actual" was unreportable and
-- overruns authorized by the client still read as overruns.
--
-- change_order_allocations mirrors vendor_bill_allocations: one CO can
-- land across several cost lines (negative amounts are credits). Only
-- APPROVED change orders count toward the revised budget.
-- =====================================================================

create table change_order_allocations (
  id uuid primary key default uuid_generate_v4(),
  change_order_id uuid not null references change_orders(id) on delete cascade,
  estimate_line_id uuid not null references project_estimate_lines(id) on delete cascade,
  amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (change_order_id, estimate_line_id)
);

create index change_order_allocations_co_idx
  on change_order_allocations(change_order_id);
create index change_order_allocations_line_idx
  on change_order_allocations(estimate_line_id);

comment on table change_order_allocations is
  'Where an approved change order lands in the cost plan. Sum may differ
   from change_orders.cost_impact while coding is in progress.';

alter table change_order_allocations enable row level security;

create policy "Admin manages change order allocations" on change_order_allocations
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists change_order_allocations_updated_at on change_order_allocations;
create trigger change_order_allocations_updated_at
  before update on change_order_allocations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Rollup learns about revised budgets. Existing columns keep their names
-- and positions (a view can't reorder); co_approved and revised_budget
-- append at the end, and `remaining` now measures against the revised
-- number — what we are actually authorized to spend.
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
  (l.estimated_amount + coalesce(coa.approved, 0))
    - greatest(coalesce(po.committed, 0), coalesce(vb.actual, 0)) as remaining,
  coalesce(coa.approved, 0)                            as co_approved,
  l.estimated_amount + coalesce(coa.approved, 0)       as revised_budget
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
) inv on true
left join lateral (
  select sum(a.amount) as approved
  from change_order_allocations a
  join change_orders co on co.id = a.change_order_id
  where a.estimate_line_id = l.id
    and co.status = 'approved'
) coa on true;

comment on view project_cost_line_rollup is
  'Budget vs committed vs actual vs billed per cost line, with approved
   change orders folded into revised_budget and remaining. Derived, never
   cached — the spreadsheet cached this and it went stale.';
