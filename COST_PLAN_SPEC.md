# Cost Codes & Budget Grid — Spec

Replaces Robby's Augusta Habitat cost sheet with a per-job budget grid that keeps
his numbering, his row order, and his working style — but adds the two things a
spreadsheet structurally cannot do: a **committed** column fed by real POs, and an
**actual** column fed by real vendor bills.

Source document: `Augusta Habitat for Humanity Cost Sheet - AUGUSTA.pdf`
(~60 cost lines, subtotal $199,004.80, total build $238,805.75, $155.27/sqft).

---

## Design principles

1. **Robby's codes win.** His `Code` column (1.1, 4.2, 23.7, 36) is the chart of
   accounts and is what gets billed against numbered city budget lines. CSI
   divisions stay as a reporting rollup, not something he types.
2. **Derive, never store, the rollups.** Committed and Actual come from POs and
   bills through a view. Storing them invites the exact drift that makes the
   spreadsheet's Over/Under column unusable.
3. **Never show a fake underrun.** An unstarted line shows its full budget as
   Remaining — not `-$19,225.00`.
4. **It should still feel like a spreadsheet.** Tab across, type, Enter drops a
   row. No modal per cell. Excel export on demand.

---

## 1. Schema

Extend `project_estimate_lines` rather than adding a parallel table — it already
carries FKs from `bid_requests.estimate_line_id` and feeds
`purchase-orders.ts:178`, `CostComparisonPanel`, `ai-estimate.ts`, and
`company-dashboard.ts`. A new table would orphan all of that.

### 1.1 Company-wide template

```sql
create table cost_code_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                       -- "8th Street Standard — Single Family"
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cost_code_template_lines (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references cost_code_templates(id) on delete cascade,
  code text not null,                       -- "4.2", "23.7"
  description text not null,                -- "Pump truck"
  section text not null,                    -- "Foundation & Concrete"
  division_code text,                       -- CSI rollup: "DIV-03"
  line_type text not null default 'cost'
    check (line_type in ('cost','markup','contingency')),
  unit text,                                -- "sqft", "SQ", "lnft", "ea", "yd"
  default_unit_cost numeric(12,4),          -- learned from completed jobs
  markup_rate numeric(6,4),                 -- markup/contingency lines only
  is_allowance boolean not null default false,
  display_order int not null default 0,
  unique (template_id, code)
);
```

### 1.2 Per-job lines

```sql
alter table project_estimate_lines
  add column if not exists code text,
  add column if not exists section text,
  add column if not exists line_type text not null default 'cost'
    check (line_type in ('cost','markup','contingency')),
  add column if not exists quantity numeric(12,3),
  add column if not exists unit text,
  add column if not exists unit_cost numeric(12,4),
  add column if not exists markup_rate numeric(6,4),
  add column if not exists is_allowance boolean not null default false,
  add column if not exists template_line_id uuid
    references cost_code_template_lines(id) on delete set null;

create unique index project_estimate_lines_code_idx
  on project_estimate_lines(project_id, code) where code is not null;
```

`estimated_amount` stays the Budget. When `quantity` and `unit_cost` are both
set, Budget is computed (`quantity * unit_cost`) and the cell is read-only with a
"from takeoff" marker; otherwise it's typed directly. That's how the inert takeoff
block at the top of the sheet starts driving dollars.

`markup_rate` fixes the Supervision mystery — $24,800.96 is 12.46% of subtotal,
which nobody picks on purpose. Markup lines compute from the cost subtotal, with
an optional typed override.

### 1.3 Attribution — the missing links

```sql
-- Committed: a PO line points at a budget line
alter table purchase_order_lines
  add column if not exists estimate_line_id uuid
    references project_estimate_lines(id) on delete set null;

-- Billed: an invoice line points at a budget line (draws come free —
-- payment_draws already links to invoices)
alter table invoice_line_items
  add column if not exists estimate_line_id uuid
    references project_estimate_lines(id) on delete set null;

-- Actual: a bill can span several codes (one lumber invoice = framing + trim)
create table vendor_bill_allocations (
  id uuid primary key default uuid_generate_v4(),
  vendor_bill_id uuid not null references vendor_bills(id) on delete cascade,
  estimate_line_id uuid not null references project_estimate_lines(id) on delete cascade,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index vendor_bill_allocations_bill_idx on vendor_bill_allocations(vendor_bill_id);
create index vendor_bill_allocations_line_idx on vendor_bill_allocations(estimate_line_id);
```

**Do not** enforce `sum(allocations) = bill.amount` with a trigger — it blocks
Robby mid-entry. Surface the difference as an "unallocated" warning in the UI.
Default behavior when a bill is created against a job: one allocation for the
full amount, code picked from a dropdown.

`cost_division` on `purchase_order_lines` stays for backward compatibility;
backfill it from the linked line's `division_code`.

### 1.4 Rollup view

```sql
create or replace view project_cost_line_rollup as
select
  l.id,
  l.project_id,
  l.code,
  l.section,
  l.trade_label,
  l.line_type,
  l.estimated_amount                                as budget,
  coalesce(po.committed, 0)                         as committed,
  coalesce(vb.actual, 0)                            as actual,
  coalesce(inv.billed, 0)                           as billed,
  l.estimated_amount
    - greatest(coalesce(po.committed, 0), coalesce(vb.actual, 0)) as remaining
from project_estimate_lines l
left join lateral (
  select sum(pol.amount) as committed
  from purchase_order_lines pol
  join purchase_orders p on p.id = pol.purchase_order_id
  where pol.estimate_line_id = l.id
    and p.status in ('issued','billed','closed')
) po on true
left join lateral (
  select sum(a.amount) as actual
  from vendor_bill_allocations a
  join vendor_bills b on b.id = a.vendor_bill_id
  where a.estimate_line_id = l.id and b.status <> 'void'
) vb on true
left join lateral (
  select sum(ili.amount) as billed
  from invoice_line_items ili
  where ili.estimate_line_id = l.id
) inv on true;
```

`greatest(committed, actual)` is deliberate — a bill against a PO shouldn't
double-count, and a bill with no PO still consumes budget.

RLS: admin-only on all new tables, matching `is_admin()` on the existing cost
tables. Views inherit from base tables; add `security_invoker = true`.

---

## 2. The grid

Route: `/admin/projects/[id]/costs` — replaces the current read-only table.

### Layout

Collapsible **sections** with subtotals (Site & Sitework, Foundation & Concrete,
Shell, Exterior Envelope, Mechanical, Interior Finishes, Site Finishes). This
gives the sheet the grouping it implies but never states.

Default columns:

| Code | Description | Budget | Committed | Actual | Remaining | |
|---|---|---|---|---|---|---|
| 7.1 | Framing Materials/decks | 19,225.00 | 18,940.00 | — | 285.00 | ● |

- A **"Show takeoff"** toggle swaps in `Qty · Unit · Unit cost` before Budget.
- The status dot: grey = not started, blue = committed, green = complete and
  within budget, amber = over. One glance tells Robby where the job stands.
- **Row expands on click** to show notes, the linked POs and bills with amounts
  and dates, and which invoice/draw billed it. This is where
  "maner quoted 6/9/26" becomes a real vendor record instead of free text.

Footer, mirroring the sheet exactly:

```
Subtotal (cost lines)          $199,004.80
Supervision        12.46%       $24,800.96   ← editable rate, live formula
P/O                             $15,000.00
Contingency         0.00%            $0.00   ← flag amber when zero
Total Build Cost               $238,805.76
                                $155.27/sqft · $163.79/heated sqft
```

`$/heated sqft` needs a heated-sqft field — `projects.square_footage` exists;
add `heated_square_footage int`.

### Editing

Autosave on blur, per row, with an inline "Saved" tick and a last-saved stamp.
No save button — Robby will forget it. Keyboard: `Tab` right, `Enter` down,
`Esc` reverts the cell. Optimistic local state, debounced server action.

Add-line and delete-line inline. Deleting a line with linked POs or bills warns
first and offers to reassign.

### Empty state

"Start cost plan from template" → picks a `cost_code_template`, copies its lines
into `project_estimate_lines` with `template_line_id` set. Existing
`importMacon608Estimate` becomes a special case of this and can be retired once
the template exists.

---

## 3. Template management

`/admin/settings/cost-codes` — list templates, edit lines, set the default.
Same grid component in a simpler mode (no Committed/Actual columns).

Seed the first template from the Augusta sheet, with these fixes applied:

- Fill the code gaps (no 5, 6, 13, 19, 20, 27–31, 33, 34) or renumber cleanly.
- Give `pump truck` and `Footers` real codes — they currently sit under 4 with none.
- Fix the ordering: it runs 4.1 → 4.3 → 4.2, and 23.1 → 23.2 → 23.4.
- Add **35 Contingency** with a real rate. Blank contingency on a $238k build
  means the first surprise eats the supervision line.
- Decide the Supervision rate rather than inheriting 12.46%.
- Add units to every line that has a takeoff quantity (siding SQ, roofing SQ,
  footers lnft, sheetrock sqft, windows ea).

**This needs the original Google Sheet or `.xlsx`.** The PDF lost every formula,
including whether Supervision was ever live and which of the two blue-text
figures (11.1 Siding Labor $3,300.00, 23.4 Flooring Labor $3,608.55) were
hand-keyed over a formula.

---

## 4. Excel export

`exceljs` is already a dependency. One button on the grid: export the job's cost
plan in Robby's exact layout — same codes, same row order, same footer — with
Committed and Actual filled in. He can still work in a sheet when he wants to;
he's just no longer the one keeping the math alive.

---

## 5. Phasing

| Phase | Scope | Unblocks |
|---|---|---|
| **A** | Schema (1.1, 1.2), template CRUD, grid read/write, footer math | Replaces the sheet for budgeting |
| **B** | Attribution (1.3) + rollup view (1.4), Committed/Actual columns, PO and bill line pickers | The real win — overruns visible at quote time |
| **C** | Billed column via `invoice_line_items.estimate_line_id`, Excel export | Draw reporting, Habitat cover sheets tie to codes |
| **D** | Unit cost library — roll completed-job actuals back into `default_unit_cost` | Faster, closer bids each house |

Phase A is usable on its own. Phase B is the reason to do this at all.

---

## 6. Open questions

1. **Original spreadsheet file** — needed to seed the template accurately (see §3).
2. **Supervision** — live percentage or a negotiated number per job?
3. **P/O $15,000** — what is this line? Profit/Overhead? It's flat, not a rate.
4. **Renumber or preserve gaps?** Preserving Robby's exact codes is less
   disruptive; renumbering is cleaner for city-line mapping. His call.
5. **Template scope** — one template for all jobs, or separate Habitat vs.
   custom-home templates? Habitat jobs bill against numbered city lines and may
   want a tighter code set.

---

## 7. Migration note

Per `CLAUDE.md`: if these migrations go in via the Supabase MCP's
`apply_migration`, the recorded version will be the MCP's own timestamp, not the
filename's. Reconcile by renaming the local file to the remote version before
committing — never `migration repair`, never re-run the DDL. Confirm with
`supabase migration list --linked` and `supabase db push --dry-run`.
