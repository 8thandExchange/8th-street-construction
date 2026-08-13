-- =====================================================================
-- COST HISTORY — the return edge of the estimating loop.
--
-- project_cost_line_rollup already reconciles budget vs committed vs
-- actual per cost line, live, within one job. Nothing carried that
-- knowledge forward: templates hardcode constants and every new estimate
-- started from the same static assumptions. This table is the memory —
-- a per-line capture of where the money actually landed, taken at
-- closeout (or any time), so future estimates can be priced from our own
-- realized costs instead of guesses.
--
-- Rows are replaced wholesale per project on each capture: the snapshot
-- is "the truth as of captured_at", not an event log.
-- =====================================================================

create table project_cost_snapshots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  -- Kept loose on purpose: the estimate line may later be deleted, but the
  -- history must survive it. Code + trade_label are denormalized for that
  -- reason — they are the joinable identity across projects.
  estimate_line_id uuid references project_estimate_lines(id) on delete set null,
  code text,
  section text,
  trade_label text not null,
  line_type text not null default 'cost',
  unit text,
  is_allowance boolean not null default false,
  budget numeric(12,2),
  committed numeric(12,2) not null default 0,
  actual numeric(12,2) not null default 0,
  billed numeric(12,2) not null default 0,
  -- Job-size context frozen at capture time, so $/sqft stays computable
  -- even if the project row changes later.
  square_footage numeric,
  heated_square_footage numeric,
  captured_at timestamptz not null default now(),
  captured_by uuid references profiles(id) on delete set null
);

create index project_cost_snapshots_project_idx on project_cost_snapshots(project_id);
create index project_cost_snapshots_code_idx on project_cost_snapshots(code);

comment on table project_cost_snapshots is
  'Per-cost-line capture of budget vs actual, taken at closeout. The memory
   the estimating system prices future jobs from. Replaced wholesale per
   project on each capture.';

alter table project_cost_snapshots enable row level security;

create policy "Admin manages cost snapshots" on project_cost_snapshots
  for all using (public.is_admin()) with check (public.is_admin());
