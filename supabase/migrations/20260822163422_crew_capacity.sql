-- =====================================================================
-- CREW / CAPACITY PLANNING.
--
-- A job has a default planned crew. Each ISO week (Monday start) can
-- override that number. Actuals come from project_daily_logs.crew_count.
-- No timecards and no crew-member roster.
-- =====================================================================

alter table public.projects
  add column if not exists planned_crew int
    check (planned_crew is null or planned_crew >= 0);

comment on column public.projects.planned_crew is
  'Default people this job needs in a week when no week row exists.';

create table if not exists public.project_crew_weeks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  week_start date not null,
  planned_crew int not null check (planned_crew >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, week_start),
  constraint project_crew_weeks_monday_chk check (extract(isodow from week_start) = 1)
);

create index if not exists project_crew_weeks_week_idx
  on public.project_crew_weeks(week_start);

comment on table public.project_crew_weeks is
  'Planned crew size for one job for one Monday-started week.';

alter table public.project_crew_weeks enable row level security;

drop policy if exists "Admin manages crew weeks" on public.project_crew_weeks;
create policy "Admin manages crew weeks"
  on public.project_crew_weeks for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists project_crew_weeks_updated_at on public.project_crew_weeks;
create trigger project_crew_weeks_updated_at
  before update on public.project_crew_weeks
  for each row execute function public.set_updated_at();
