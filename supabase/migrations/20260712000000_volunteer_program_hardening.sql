-- =====================================================================
-- 2026-07-12 — Volunteer program (Habitat-controlled) + RLS hardening.
-- Applied to the live project on 2026-07-12 via MCP; this file brings the
-- repo in line with the database.
-- =====================================================================

-- =====================================================================
-- 1. SECURITY HARDENING
-- =====================================================================

-- 1a. Profiles: prevent role self-escalation. The original policy had no
-- WITH CHECK, so any user could set role='admin' on their own row.
drop policy if exists "Own profile update" on profiles;
create policy "Own profile update" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = public.user_role());

-- 1b. Change orders: the client UPDATE policy was unrestricted (a client
-- could self-approve, alter cost_impact, or move rows between projects).
-- Clients may only act on orders awaiting their signature, and only to
-- approve or reject them. Uses client_has_project_portal_access() from
-- 20260701140000_portal_access_toggles.sql.
drop policy if exists "Client signs change orders" on change_orders;
create policy "Client signs change orders" on change_orders
  for update using (
    status = 'pending_client'
    and public.client_has_project_portal_access(project_id)
  )
  with check (
    status in ('approved', 'rejected')
    and public.client_has_project_portal_access(project_id)
  );

-- 1c. Audit log: entries must be attributed to their real author.
drop policy if exists "Anyone authenticated can append audit log" on audit_log;
create policy "Authenticated appends own audit entries" on audit_log
  for insert with check (auth.uid() is not null and actor_id = auth.uid());

-- 1d. Storage: write policies for the avatars bucket (project-updates
-- gained policies in 20260604100000; avatars had none).
drop policy if exists "Public reads avatars" on storage.objects;
create policy "Public reads avatars" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "Admin inserts avatars" on storage.objects;
create policy "Admin inserts avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and public.is_admin());
drop policy if exists "Admin updates avatars" on storage.objects;
create policy "Admin updates avatars" on storage.objects
  for update using (bucket_id = 'avatars' and public.is_admin());
drop policy if exists "Admin deletes avatars" on storage.objects;
create policy "Admin deletes avatars" on storage.objects
  for delete using (bucket_id = 'avatars' and public.is_admin());

-- =====================================================================
-- 2. VOLUNTEER PROGRAM — Habitat for Humanity build days
-- =====================================================================
-- Registration is HABITAT-CONTROLLED: our site publishes the build-day
-- schedule well in advance and routes volunteers to Habitat's own
-- registration (external_signup_url per event). volunteer_signups exists
-- for a possible future co-managed mode but nothing public writes to it.

do $$ begin
  create type volunteer_event_status as enum ('scheduled', 'full', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists volunteer_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  partner text not null default 'Habitat for Humanity',
  location text,
  event_date date not null,
  start_time time not null default '08:00',
  end_time time not null default '15:00',
  capacity int not null default 20 check (capacity > 0),
  signup_deadline date,
  what_to_bring text,
  skills_needed text,
  status volunteer_event_status not null default 'scheduled',
  published boolean not null default false,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habitat's registration link for this event (VolunteerHub etc.).
-- The public page falls back to a contact email when null.
alter table volunteer_events
  add column if not exists external_signup_url text;

create index if not exists volunteer_events_date_idx
  on volunteer_events(event_date) where published = true;

create table if not exists volunteer_signups (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references volunteer_events(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  group_size int not null default 1 check (group_size between 1 and 10),
  experience_level text,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlist', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

create index if not exists volunteer_signups_event_idx
  on volunteer_signups(event_id, status);

drop trigger if exists set_updated_at_volunteer_events on volunteer_events;
create trigger set_updated_at_volunteer_events
  before update on volunteer_events
  for each row execute function set_updated_at();

alter table volunteer_events enable row level security;
alter table volunteer_signups enable row level security;

drop policy if exists "Public reads published volunteer events" on volunteer_events;
create policy "Public reads published volunteer events" on volunteer_events
  for select using (published = true);
drop policy if exists "Admin manages volunteer events" on volunteer_events;
create policy "Admin manages volunteer events" on volunteer_events
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin manages volunteer signups" on volunteer_signups;
create policy "Admin manages volunteer signups" on volunteer_signups
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed a forward schedule (only when the table is empty): Saturdays
-- starting ~4 weeks out, spaced two weeks apart.
do $$
declare
  next_sat date := current_date + ((6 - extract(dow from current_date)::int + 7) % 7);
begin
  if not exists (select 1 from volunteer_events) then
    insert into volunteer_events
      (title, description, location, event_date, start_time, end_time, capacity, signup_deadline, what_to_bring, skills_needed, published)
    values
      ('Wall Raising — Build Day',
       'Help raise exterior walls on a Habitat home. Crew leads from 8th Street Construction run every station — you''ll swing a hammer within the first hour.',
       'Augusta, GA (address provided at registration)',
       next_sat + 28, '08:00', '15:00', 24, next_sat + 21,
       'Closed-toe shoes, water bottle, sunscreen. Tools, gloves, and hard hats provided.',
       'No experience needed — every station has a crew lead.',
       true),
      ('Framing & Sheathing — Build Day',
       'Interior wall framing and exterior sheathing. Great day for first-timers and returning crews alike.',
       'Augusta, GA (address provided at registration)',
       next_sat + 42, '08:00', '15:00', 24, next_sat + 35,
       'Closed-toe shoes, water bottle, sunscreen. Tools, gloves, and hard hats provided.',
       'No experience needed.',
       true),
      ('Roofing & Windows — Build Day',
       'Roof decking and window installation with our licensed crew leads. Ground-crew roles available for anyone not comfortable on ladders.',
       'Augusta, GA (address provided at registration)',
       next_sat + 56, '08:00', '15:00', 20, next_sat + 49,
       'Closed-toe shoes, water bottle, sunscreen. Tools, gloves, and hard hats provided.',
       'Some experience helpful for roof roles; ground roles open to all.',
       true),
      ('Siding & Paint — Community Day',
       'Siding, trim, and exterior paint — the day the house starts looking like a home. Family-friendly (16+ on site, 18+ on tools).',
       'Augusta, GA (address provided at registration)',
       next_sat + 70, '08:00', '15:00', 30, next_sat + 63,
       'Clothes you can paint in, closed-toe shoes, water bottle. Everything else provided.',
       'No experience needed.',
       true);
  end if;
end $$;
