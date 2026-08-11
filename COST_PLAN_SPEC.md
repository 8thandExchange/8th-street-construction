# Cost Codes & Budget Grid — Spec

Replaces Robby's Augusta Habitat cost sheet with a per-job budget grid that keeps
his numbering, his row order, and his working style — but adds the two things a
spreadsheet structurally cannot do: a **committed** column fed by real POs, and an
**actual** column fed by real vendor bills.

Source: `Augusta Habitat for Humanity Cost Sheet.xlsx` — a five-tab workbook
(Augusta, Riverwalk, Broad Street, Savannah, 608 Macon). Augusta: 69 cost lines,
subtotal $199,004.80, total build $238,805.75, $155.27/sqft.

---

## 0. What the workbook actually showed

An earlier read of this sheet was based on the PDF export, which flattens every
formula to a value. Two conclusions from that read were wrong, and the
correction shaped the design below.

**The takeoff is not decorative — it drives the budget.** About 30 of the 69
lines are live formulas off the takeoff block: `roofing_sq * 150`,
`heated_sqft * 3`, `cabinet_lnft * cabinet_unit_cost`,
`(concrete_sqft * 1.5 + 500) + (footer_lnft * 15)`. Change the plan and the
sheet already recalculates. So formula evaluation is **parity, not a new
feature** — a grid without it would be a downgrade.

**Supervision is a formula:** `subtotal * 0.2 - 15000`. A flat 20% total markup
with the fixed $15,000 P/O carved out of it, which is why it reads as an odd
12.46%. Total Build Cost is exactly `subtotal * 1.20`.

**Robby already templates by duplicating a tab.** All five jobs carry an
identical 69-line code list, and 56 of the 69 carry identical formulas. The
template table below formalizes a practice that already exists.

Defects confirmed in the file itself:

| | |
|---|---|
| Draw column sums the wrong column | Checkboxes are in `D`; `E91=SUM(E22:E89)` and `E94=SUM(E91:E92)` sum empty column `E`. Draw tracking has always totalled zero. |
| Over/Under exists on 18 of 69 rows | The formula was never filled down. |
| `H90 = G90` | Contingency's Over/Under is missing its `- C90`. |
| `J30 = SUM(G23:G30)` | Orphan sum of eight actuals, parked in the middle of the takeoff block. |
| 8.3 Interior Doors | Augusta and 608 Macon hardcode `20 * 200 * 1.08` while the takeoff says 14 doors. The other three tabs use `interior_doors * 200 * 1.08`. Augusta is overstated $1,296. |
| 608 Macon 21.0 Cabinets | Typed `8000`, overwriting `cabinet_lnft * cabinet_unit_cost`. |
| `C3 "Total SQFT" = C4 + C8` | Heated plus front porch only — excludes back patio (122) and front deck (80). Framing 7.1/7.2 bill off this number. |
| 15.0 HVAC | `13660 + 10150 - 10000` — quote arithmetic with no takeoff link, and it diverges on every tab. |

---

## Design principles

1. **Robby's codes win.** His `Code` column (1.1, 4.2, 23.7, 36) is the chart of
   accounts and is what gets billed against numbered city budget lines. CSI
   divisions stay as a reporting rollup, not something he types.
2. **Keep the formulas.** The grid evaluates the same expressions the sheet
   does, over the same named takeoff values. Anything less loses capability.
3. **Derive, never store, the rollups.** Committed and Actual come from POs and
   bills through a view. Storing them invites the exact drift that makes the
   spreadsheet's Over/Under column unusable.
4. **Never show a fake underrun.** An unstarted line shows its full budget as
   Remaining — not `-$19,225.00`.
5. **It should still feel like a spreadsheet.** Tab across, type, Enter drops a
   row. No modal per cell. Excel export on demand.

---

## 1. Schema

Extend `project_estimate_lines` rather than adding a parallel table — it already
carries FKs from `bid_requests.estimate_line_id` and feeds
`purchase-orders.ts:178`, `CostComparisonPanel`, `ai-estimate.ts`, and
`company-dashboard.ts`. A new table would orphan all of that.

### 1.1 Company-wide template

Four tables — see
[`20260811120000_cost_code_templates.sql`](supabase/migrations/20260811120000_cost_code_templates.sql)
for the authoritative DDL:

- **`cost_code_templates`** — named template, one default at a time.
- **`cost_code_template_takeoff`** — the named takeoff variables a job starts
  with (`heated_sqft`, `roofing_sq`, `plumbing_drops`, …), each with a unit, a
  default value, and an optional `formula` so derived quantities stay derived
  (`heated_sqft = first_floor + second_floor`).
- **`cost_code_template_lines`** — `code`, `label`, `section`, `division_code`,
  `line_type`, `unit`, `formula`, `default_amount`, `is_allowance`.
- **`project_takeoff_values`** — the per-job copy of the takeoff.

A quantity × unit-cost model was the original plan and it is too weak: it can't
express `(concrete_sqft * 1.5 + 500) + (footer_lnft * 15)` or the electrician
line's fixture-count sum. A single `formula` column carries all 30 of the
workbook's live cells without losing any of them.

### 1.2 Per-job lines

```sql
alter table project_estimate_lines
  add column if not exists code text,
  add column if not exists section text,
  add column if not exists line_type text not null default 'cost',
  add column if not exists unit text,
  add column if not exists formula text,
  add column if not exists is_allowance boolean not null default false,
  add column if not exists template_line_id uuid
    references cost_code_template_lines(id) on delete set null;
```

`estimated_amount` stays the Budget. When `formula` is set, Budget is its
evaluated result and the cell renders read-only with a "from takeoff" marker;
otherwise it's typed directly.

### 1.2b Formula evaluation

[`src/lib/estimate/formula.ts`](src/lib/estimate/formula.ts) — a hand-written
recursive-descent parser over `+ - * / ( )`, numbers and names. No `eval`, no
`new Function`; these strings are admin-editable and live in the database.
Name lookup uses `hasOwnProperty`, so bare words like `constructor` fail as
unknown names rather than resolving up the prototype chain.

Evaluation order mirrors the sheet: takeoff values resolve first (depth-first,
with cycle detection), then cost lines sum to `subtotal`, then markup and
contingency lines evaluate with `subtotal` in scope. Markup never feeds the
subtotal. A line or takeoff cell that fails records an error and falls back to
its stored amount, so one bad expression can't blank the grid.

[`__tests__/formula.test.ts`](src/lib/estimate/__tests__/formula.test.ts) pins
this to the workbook: 27 individual lines plus subtotal, supervision, total and
both $/sqft figures, all asserted against Augusta's own values.

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

| Phase | Scope | Status |
|---|---|---|
| **A** | Schema (1.1, 1.2), template CRUD, grid read/write, footer math | ✅ shipped |
| **B** | Attribution (1.3) + rollup view (1.4), Committed/Actual/Billed, coding queue | ✅ shipped |
| **C** | Excel export of a job's plan in Robby's layout | open |
| **D** | Unit cost library — roll completed-job actuals back into template pricing | open |

Phase C's draw reporting came free with Phase B: `payment_draws` already links to
`invoices`, so once an invoice line carries `estimate_line_id`, "what was in
draw 3" is a join rather than a feature.

### Phase B notes

`project_cost_line_rollup` derives Committed (issued/billed/closed PO lines),
Actual (non-void vendor bill allocations) and Billed (invoice lines on sent-or-
later invoices). Remaining is `budget − greatest(committed, actual)`: a PO that
has been billed must not count twice, and a bill with no PO still consumes
budget.

`vendor_bill_allocations` splits one bill across codes — a lumber invoice covers
framing and trim. Deliberately **not** constrained to sum to the bill total; a
trigger enforcing that rejects every partially-coded bill mid-entry. The
remainder surfaces in the UI instead.

[`CostAttributionQueue`](src/components/costs/CostAttributionQueue.tsx) is the
piece that makes the gap visible: any bill or invoice line on the job with no
cost code sits in a queue above the grid, one dropdown from being coded. Money
recorded but uncoded shows in no line's Actual, so without the queue the plan
under-reports silently.

Invoice attribution is orthogonal to city budget lines. A Habitat invoice line
carries both — `city_budget_line_id` says which numbered city line pays,
`estimate_line_id` says which cost code it was spent on.

---

## 6. Open questions

Resolved by the workbook: the source file (§0), and Supervision
(`subtotal * 0.2 - 15000`, seeded literally).

1. **P/O $15,000** — flat on all five jobs, and Supervision is defined as
   20% *minus* it. Is it a fixed fee, or should it scale? Seeded as a fixed
   markup line, which reproduces every tab exactly.
2. **`total_sqft` excludes back patio and deck**, yet framing bills off it. Is
   that intentional (framing follows the porch roof, not the deck), or a
   long-standing error worth ~$2,500 on Augusta? Seeded as-is — this is a
   pricing question, not a code question.
3. **8.3 Interior Doors** — the seed uses `interior_doors * 200 * 1.08`, the
   version on three of five tabs. Confirm before the first job starts from it.
4. **Renumber or preserve gaps?** Preserved as-is for now, including 5.15
   sorting between 5.1 and 5.2.
5. **Template scope** — one template for all jobs, or separate Habitat vs.
   custom-home templates? Habitat jobs bill against numbered city lines and may
   want a tighter code set.
6. **608 Macon's existing cost plan.** The importer reproduces its sheet to the
   penny but will not overwrite the 15 legacy CSI division lines without
   `--replace-project`. Those lines have no bids and no awarded amounts, so
   replacing them loses nothing — it just needs saying out loud.

---

## 7. The workbook importer

[`scripts/import-cost-sheet.ts`](scripts/import-cost-sheet.ts) —
`npm run costs:import -- <workbook.xlsx> [--run] [--replace-project]`.
Dry run by default.

Augusta, Riverwalk, Broad Street and Savannah are **house models in the
collection**, not job sites, so they import as named cost code templates —
pick "The Augusta" when starting a job and its takeoff and pricing come with
it. Only 608 Macon is a real project, and it imports as that project's cost
plan.

Canonical structure (labels, sections, units, divisions, line types) comes
from the default template already in the database; a tab supplies only numbers
and formulas. Excel cell references are rewritten to takeoff keys, with `C91`
mapped to the reserved name `subtotal` so Supervision imports as a live
formula rather than a frozen number.

Precedence, learned from the tabs disagreeing with each other:

1. A cell with a formula referencing other cells wins — it encodes that
   model's geometry. The Riverwalk roofs off the second floor; the models with
   garages fold the garage into the slab.
2. A **typed number** where the standard derives one is a deliberate override
   and also wins. Broad Street and Savannah pin roofing SQ by hand instead of
   taking 1.3 × footprint.
3. Constant arithmetic with no cell references (`=1123+821`) is a tally, not a
   reusable expression — the result is stored as the value.
4. Only an empty cell falls back to the standard formula.

Every tab is re-evaluated after translation and checked against its own
`C91`/`C94`, with a per-line diff for anything that disagrees by more than a
cent. All five reconcile exactly.

---

## 7. Migration note

Per `CLAUDE.md`: if these migrations go in via the Supabase MCP's
`apply_migration`, the recorded version will be the MCP's own timestamp, not the
filename's. Reconcile by renaming the local file to the remote version before
committing — never `migration repair`, never re-run the DDL. Confirm with
`supabase migration list --linked` and `supabase db push --dry-run`.
