-- =====================================================================
-- MEETINGS, MINUTES & ACTION ITEMS
--
-- Compliance-grade meeting record for 8th Street Construction, LLC:
--   * meeting_series      recurring meetings + their standing agenda template
--   * meetings            one sitting, its minutes, and its approval state
--   * meeting_attendees   who was there (internal profiles OR external guests)
--   * meeting_agenda_items  numbered agenda with per-item notes / outcome
--   * meeting_decisions   resolutions — the part an auditor or lender reads
--   * meeting_action_items  who owes what by when, optionally pushed into a
--                         project as a real project_task
--   * meeting_action_updates  append-only status trail (the "where are we at"
--                         replies), so progress is evidenced, not remembered
--   * meeting_nudge_log   proof the system asked for an update, and when
--
-- Approved minutes are locked by trigger: to change an approved record you
-- must reopen it with a written reason, which stays on the row forever.
-- =====================================================================

set search_path = public, extensions;

create type meeting_kind as enum (
  'board',
  'partner',
  'client',
  'internal',
  'site'
);

create type meeting_status as enum (
  'scheduled',
  'in_progress',
  'draft_minutes',
  'approved',
  'archived'
);

create type action_item_status as enum (
  'open',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create type action_item_source as enum (
  'meeting',
  'email',
  'assistant',
  'manual'
);

-- =====================================================================
-- MEETING SERIES — the recurring meeting and its standing agenda
-- =====================================================================
create table meeting_series (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  kind meeting_kind not null default 'internal',
  cadence text,                                   -- 'Weekly, Wednesdays 9am'
  partner_org text,                               -- 'Augusta/CSRA Habitat for Humanity'
  project_id uuid references projects(id) on delete set null,
  -- [{ "number": "1", "title": "Confirm previous minutes" }, ...]
  agenda_template jsonb not null default '[]'::jsonb,
  -- [{ "name": "Robby", "email": "...", "organization": "8th Street", "role": "chair" }, ...]
  default_attendees jsonb not null default '[]'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meeting_series_active_idx on meeting_series(is_active, kind);

-- =====================================================================
-- MEETINGS
-- =====================================================================
create table meetings (
  id uuid primary key default uuid_generate_v4(),
  series_id uuid references meeting_series(id) on delete set null,
  title text not null,
  kind meeting_kind not null default 'internal',
  meeting_date date not null,
  started_at timestamptz,
  ended_at timestamptz,
  location text,
  project_id uuid references projects(id) on delete set null,
  status meeting_status not null default 'scheduled',

  purpose text,
  summary text,                                   -- 2-3 line plain-English recap
  minutes_md text,                                -- the written minutes (markdown)
  raw_notes text,                                 -- pasted email / transcript, kept verbatim
  source_reference text,                          -- 'Email from mbeech@augustahabitat.org, Aug 6 2026'
  next_meeting_date date,

  prepared_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  approved_snapshot text,                         -- minutes text frozen at approval
  reopened_at timestamptz,
  reopen_reason text,

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetings_date_idx on meetings(meeting_date desc);
create index meetings_series_idx on meetings(series_id, meeting_date desc);
create index meetings_status_idx on meetings(status);
create index meetings_project_idx on meetings(project_id) where project_id is not null;

-- =====================================================================
-- ATTENDEES — internal profiles and external guests share one table
-- =====================================================================
create table meeting_attendees (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  email citext,
  organization text,
  role text not null default 'attendee',          -- chair | secretary | attendee | guest | apology
  present boolean not null default true,
  created_at timestamptz not null default now()
);

create index meeting_attendees_meeting_idx on meeting_attendees(meeting_id);
create index meeting_attendees_profile_idx on meeting_attendees(profile_id) where profile_id is not null;

-- =====================================================================
-- AGENDA ITEMS
-- =====================================================================
create table meeting_agenda_items (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  position int not null default 0,
  number text,                                    -- '2.1' — matches Robby's numbering
  title text not null,
  notes_md text,
  outcome text,
  status text not null default 'open',            -- open | closed | carried
  carried_from_item_id uuid references meeting_agenda_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meeting_agenda_meeting_idx on meeting_agenda_items(meeting_id, position);

-- =====================================================================
-- DECISIONS / RESOLUTIONS
-- =====================================================================
create table meeting_decisions (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  agenda_item_id uuid references meeting_agenda_items(id) on delete set null,
  decision text not null,
  rationale text,
  moved_by text,
  seconded_by text,
  created_at timestamptz not null default now()
);

create index meeting_decisions_meeting_idx on meeting_decisions(meeting_id);

-- =====================================================================
-- ACTION ITEMS — the spine of the whole system
-- =====================================================================
create table meeting_action_items (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete set null,
  agenda_item_id uuid references meeting_agenda_items(id) on delete set null,

  title text not null,
  detail text,

  owner_profile_id uuid references profiles(id) on delete set null,
  owner_name text,                                -- 'McKenzie' when there's no portal account
  owner_email citext,
  owner_org text,
  is_external boolean not null default false,     -- true = owner is outside 8th Street

  due_date date,
  status action_item_status not null default 'open',
  priority task_priority not null default 'normal',

  project_id uuid references projects(id) on delete set null,
  project_task_id uuid references project_tasks(id) on delete set null,

  source action_item_source not null default 'meeting',
  nudge_enabled boolean not null default true,
  last_nudge_at timestamptz,
  nudge_count int not null default 0,
  completed_at timestamptz,

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index action_items_status_idx on meeting_action_items(status, due_date);
create index action_items_meeting_idx on meeting_action_items(meeting_id);
create index action_items_owner_idx on meeting_action_items(owner_profile_id) where owner_profile_id is not null;
create index action_items_project_idx on meeting_action_items(project_id) where project_id is not null;
create index action_items_open_idx on meeting_action_items(due_date)
  where status in ('open', 'in_progress', 'blocked');

-- =====================================================================
-- UPDATE TRAIL — append-only; never edited, never deleted in the UI
-- =====================================================================
create table meeting_action_updates (
  id uuid primary key default uuid_generate_v4(),
  action_item_id uuid not null references meeting_action_items(id) on delete cascade,
  body text not null,
  status_after action_item_status,
  author_profile_id uuid references profiles(id) on delete set null,
  author_name text,
  source text not null default 'admin',           -- admin | assistant | email | nudge_reply
  created_at timestamptz not null default now()
);

create index action_updates_item_idx on meeting_action_updates(action_item_id, created_at desc);

-- =====================================================================
-- NUDGE LOG — evidence the system asked, and who it asked
-- =====================================================================
create table meeting_nudge_log (
  id uuid primary key default uuid_generate_v4(),
  action_item_id uuid references meeting_action_items(id) on delete cascade,
  sent_to text not null,
  tier text not null,                             -- upcoming | due | overdue | stale
  channel text not null default 'email',
  sent_at timestamptz not null default now()
);

create index nudge_log_item_idx on meeting_nudge_log(action_item_id, sent_at desc);

-- =====================================================================
-- APPROVED MINUTES ARE LOCKED
--
-- Once minutes are approved they are the company's record of what happened.
-- Editing them requires an explicit reopen with a written reason, which is
-- kept on the row. The approved text itself is frozen in approved_snapshot.
-- =====================================================================
create or replace function public.guard_approved_minutes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'approved' and new.status = 'approved' then
    if new.minutes_md is distinct from old.minutes_md
       or new.summary is distinct from old.summary
       or new.meeting_date is distinct from old.meeting_date
       or new.approved_snapshot is distinct from old.approved_snapshot then
      raise exception
        'These minutes are approved and locked. Reopen them with a reason before editing.'
        using errcode = 'check_violation';
    end if;
  end if;

  if old.status = 'approved' and new.status <> 'approved' then
    if coalesce(btrim(new.reopen_reason), '') = '' then
      raise exception 'Reopening approved minutes requires a reason.'
        using errcode = 'check_violation';
    end if;
    new.reopened_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger meetings_guard_approved
  before update on meetings
  for each row execute function public.guard_approved_minutes();

-- Approved minutes keep their agenda notes and decisions too.
create or replace function public.guard_approved_meeting_children()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status meeting_status;
  parent_id uuid;
begin
  if tg_op = 'DELETE' then
    parent_id := old.meeting_id;
  else
    parent_id := new.meeting_id;
  end if;

  select status into parent_status from meetings where id = parent_id;

  if parent_status = 'approved' then
    raise exception
      'These minutes are approved and locked. Reopen the meeting before changing it.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger agenda_items_guard_approved
  before insert or update or delete on meeting_agenda_items
  for each row execute function public.guard_approved_meeting_children();

create trigger decisions_guard_approved
  before insert or update or delete on meeting_decisions
  for each row execute function public.guard_approved_meeting_children();

-- Action items intentionally stay editable after approval: the minutes record
-- what was agreed, and the action item records how the work went afterwards.

-- =====================================================================
-- RLS — admin-only surface (the service role bypasses RLS for cron)
-- =====================================================================
alter table meeting_series enable row level security;
alter table meetings enable row level security;
alter table meeting_attendees enable row level security;
alter table meeting_agenda_items enable row level security;
alter table meeting_decisions enable row level security;
alter table meeting_action_items enable row level security;
alter table meeting_action_updates enable row level security;
alter table meeting_nudge_log enable row level security;

create policy "Admin manages meeting series" on meeting_series
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages meetings" on meetings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages meeting attendees" on meeting_attendees
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages agenda items" on meeting_agenda_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages decisions" on meeting_decisions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages action items" on meeting_action_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manages action updates" on meeting_action_updates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin reads nudge log" on meeting_nudge_log
  for select using (public.is_admin());

-- =====================================================================
-- SEED — the two live meeting series
-- =====================================================================
insert into meeting_series (slug, name, kind, cadence, partner_org, agenda_template, default_attendees, notes)
values
  (
    'board',
    '8th Street Construction, LLC — Board Meeting',
    'board',
    'Monthly',
    null,
    '[
      {"number":"1","title":"Confirm previous minutes"},
      {"number":"2","title":"Matters arising"},
      {"number":"3","title":"Progress reports"},
      {"number":"4","title":"Cashflow"},
      {"number":"5","title":"New/pending business/jobs"},
      {"number":"6","title":"Matters arising"},
      {"number":"7","title":"General"}
    ]'::jsonb,
    '[
      {"name":"Robby","email":"robby@8thstreetconstruction.com","organization":"8th Street Construction","role":"chair"},
      {"name":"Troy Akers","email":"troy.w.akers@gmail.com","organization":"8th Street Construction","role":"secretary"}
    ]'::jsonb,
    'Standing agenda proposed by Robby. Progress reports get one numbered sub-line per active job; the system fills them in from the live job list.'
  ),
  (
    'habitat-weekly',
    '8th Street / Habitat Weekly Connect',
    'partner',
    'Weekly',
    'Augusta/CSRA Habitat for Humanity',
    '[
      {"number":"1","title":"Confirm previous minutes"},
      {"number":"2","title":"Matters arising"},
      {"number":"3","title":"Current construction"},
      {"number":"4","title":"Upcoming construction"},
      {"number":"5","title":"Volunteer scheduling"},
      {"number":"6","title":"Community events"},
      {"number":"7","title":"General"}
    ]'::jsonb,
    '[
      {"name":"Robby","email":"robby@8thstreetconstruction.com","organization":"8th Street Construction","role":"attendee"},
      {"name":"McKenzie Beech","email":"mbeech@augustahabitat.org","organization":"Augusta/CSRA Habitat for Humanity","role":"chair"},
      {"name":"Gary Arnette","email":"garnette@augustahabitat.org","organization":"Augusta/CSRA Habitat for Humanity","role":"attendee"}
    ]'::jsonb,
    'Weekly partnership call. Minutes have historically been written by McKenzie and emailed out.'
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- SEED — the Habitat weekly connect held 2026-08-06, from McKenzie's email
-- ---------------------------------------------------------------------
do $$
declare
  v_series uuid;
  v_meeting uuid;
  v_current uuid;
  v_upcoming uuid;
  v_volunteers uuid;
  v_events uuid;
begin
  select id into v_series from meeting_series where slug = 'habitat-weekly';

  if exists (select 1 from meetings where series_id = v_series and meeting_date = date '2026-08-06') then
    return;
  end if;

  insert into meetings (
    series_id, title, kind, meeting_date, status, summary, source_reference, raw_notes
  ) values (
    v_series,
    '8th Street / Habitat Weekly Connect',
    'partner',
    date '2026-08-06',
    'draft_minutes',
    'Alignment on the partnership: 608 Macon is underway, four more Habitat houses are coming and all four will be coordinated by 8th Street. Habitat wants a groundbreaking ceremony at 605 Eve St as a community introduction in Harrisburg, and both sides need to settle volunteer scheduling.',
    'Email from McKenzie Beech (mbeech@augustahabitat.org), Aug 6 2026 — "Meeting Minutes: 8th Street/Habitat Weekly Connect"',
    'Current Construction: 608 Macon Ave. Upcoming Construction: 1825 Watkins, 605 Eve St, 1912 Fenwick, 1137 Merry St.'
  ) returning id into v_meeting;

  insert into meeting_attendees (meeting_id, name, email, organization, role) values
    (v_meeting, 'McKenzie Beech', 'mbeech@augustahabitat.org', 'Augusta/CSRA Habitat for Humanity', 'chair'),
    (v_meeting, 'Gary Arnette', 'garnette@augustahabitat.org', 'Augusta/CSRA Habitat for Humanity', 'attendee'),
    (v_meeting, 'Robby', 'robby@8thstreetconstruction.com', '8th Street Construction', 'attendee');

  insert into meeting_agenda_items (meeting_id, position, number, title, notes_md, status)
  values (v_meeting, 0, '3', 'Current construction', '- 608 Macon Ave — in progress', 'closed')
  returning id into v_current;

  insert into meeting_agenda_items (meeting_id, position, number, title, notes_md, status)
  values (
    v_meeting, 1, '4', 'Upcoming construction',
    E'- 1825 Watkins\n- 605 Eve St\n- 1912 Fenwick\n- 1137 Merry St\n\nAll four will be coordinated by 8th Street.',
    'closed'
  )
  returning id into v_upcoming;

  insert into meeting_agenda_items (meeting_id, position, number, title, notes_md, status)
  values (
    v_meeting, 2, '5', 'Volunteer scheduling',
    'Habitat and 8th Street need to align on three projects that volunteers can be scheduled to participate in. Volunteers capped at 10 people per house.',
    'open'
  )
  returning id into v_volunteers;

  insert into meeting_agenda_items (meeting_id, position, number, title, notes_md, status)
  values (
    v_meeting, 3, '6', 'Community events',
    'Habitat needs a groundbreaking ceremony at 605 Eve St as a community introduction to the work Habitat and 8th Street are doing in Harrisburg.',
    'open'
  )
  returning id into v_events;

  insert into meeting_decisions (meeting_id, agenda_item_id, decision) values
    (v_meeting, v_upcoming, 'All four upcoming Habitat houses — 1825 Watkins, 605 Eve St, 1912 Fenwick and 1137 Merry St — will be coordinated by 8th Street.'),
    (v_meeting, v_volunteers, 'Volunteers are capped at a maximum of 10 people per house.'),
    (v_meeting, v_events, 'Habitat will hold a groundbreaking ceremony at 605 Eve St as a community introduction in the Harrisburg neighborhood.');

  insert into meeting_action_items (
    meeting_id, agenda_item_id, title, detail, owner_name, owner_email, owner_org,
    is_external, status, priority, project_id, source
  ) values
    (
      v_meeting, v_upcoming,
      'Email Robby the next 5 houses for the start of 2027',
      null,
      'McKenzie Beech', 'mbeech@augustahabitat.org', 'Augusta/CSRA Habitat for Humanity',
      true, 'open', 'normal', null, 'meeting'
    ),
    (
      v_meeting, v_volunteers,
      'Keep volunteers per house at a maximum of 10 people',
      'Standing constraint on all Habitat volunteer days.',
      'Habitat', 'mbeech@augustahabitat.org', 'Augusta/CSRA Habitat for Humanity',
      true, 'open', 'normal', null, 'meeting'
    ),
    (
      v_meeting, v_volunteers,
      'Come back with volunteer dates/activities on all 4 upcoming construction lots',
      '1825 Watkins, 605 Eve St, 1912 Fenwick, 1137 Merry St.',
      'Robby', 'robby@8thstreetconstruction.com', '8th Street Construction',
      false, 'open', 'high', null, 'meeting'
    ),
    (
      v_meeting, v_events,
      'Come back with best week for groundbreaking ceremony on 605 Eve St',
      'Not raised in the meeting, but noted in the emailed minutes: early in the week of Aug 24 would be ideal for Habitat.',
      'Robby', 'robby@8thstreetconstruction.com', '8th Street Construction',
      false, 'open', 'high',
      (select id from projects where title ilike '%605 Eve%' limit 1),
      'meeting'
    );

  -- Link owners to portal accounts where one exists.
  update meeting_action_items ai
     set owner_profile_id = p.id
    from profiles p
   where ai.meeting_id = v_meeting
     and ai.owner_email is not null
     and p.email = ai.owner_email;
end $$;
