-- =====================================================================
-- 8th Street Construction — Initial Schema
-- =====================================================================
-- Covers BOTH the marketing surface (leads, projects gallery, testimonials,
-- consultations) AND the full PM platform foundation (project lifecycle,
-- documents, messages, subcontractor bidding) so no painful refactor later.
--
-- Role model:
--   - admin           : internal team (8th Street staff)
--   - client          : a customer with active project(s)
--   - subcontractor   : trade partner / vendor
--
-- Anonymous public users can read PUBLISHED marketing content only.
-- =====================================================================

-- Extensions ------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================
-- ENUMS
-- =====================================================================
create type user_role as enum ('admin', 'client', 'subcontractor');

create type lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
  'archived'
);

create type project_category as enum (
  'custom_home',
  'residential_renovation',
  'commercial_new_build',
  'tenant_buildout',
  'design_build',
  'historic_restoration'
);

create type project_status as enum (
  'draft',           -- internal only, not visible publicly
  'pre_construction',
  'in_progress',
  'completed',
  'on_hold',
  'archived'
);

create type milestone_status as enum (
  'pending',
  'in_progress',
  'completed',
  'blocked'
);

create type consultation_status as enum (
  'requested',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

create type bid_status as enum (
  'invited',
  'viewed',
  'submitted',
  'shortlisted',
  'awarded',
  'declined',
  'withdrawn'
);

create type change_order_status as enum (
  'draft',
  'pending_client',
  'approved',
  'rejected'
);

-- =====================================================================
-- PROFILES — extends auth.users with role + display info
-- =====================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  first_name text,
  last_name text,
  email citext unique not null,
  phone text,
  company text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);

-- Helper: get current user's role without recursive RLS lookups
-- (Defined on public schema — Supabase restricts creating objects in auth.*)
create or replace function public.user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false)
$$;

-- NOTE: The previous auto-create-profile trigger was removed because Supabase no longer permits SQL access to the auth schema. Instead, create a profiles row manually for each new user via the admin client, or set up a Database Webhook in the Supabase dashboard pointing at auth.users INSERT events.

-- =====================================================================
-- LEADS — inbound inquiries from the public contact form
-- =====================================================================
create table leads (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email citext not null,
  phone text,
  project_type project_category,
  message text not null,
  status lead_status not null default 'new',
  source text default 'website',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ip_address inet,
  user_agent text,
  assigned_to uuid references profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  qualified_at timestamptz,
  closed_at timestamptz
);

create index leads_status_idx on leads(status);
create index leads_created_idx on leads(created_at desc);
create index leads_email_idx on leads(email);

-- =====================================================================
-- PROJECTS — the unified portfolio + active project record
-- =====================================================================
create table projects (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  subtitle text,
  category project_category not null,
  status project_status not null default 'draft',

  -- Public-facing portfolio content
  excerpt text,                          -- card teaser, ~140 chars
  narrative text,                        -- full project story (markdown)
  hero_image_url text,
  location text,                         -- "Augusta, GA" / "Evans, GA"
  year_completed int,
  square_footage int,
  budget_range text,                     -- "$500K-$750K" (display string)

  -- Internal PM fields
  client_id uuid references profiles(id) on delete set null,
  project_manager_id uuid references profiles(id) on delete set null,
  start_date date,
  target_completion_date date,
  actual_completion_date date,
  contract_value numeric(12, 2),         -- internal only
  internal_notes text,

  -- SEO + display
  meta_description text,
  display_order int default 0,           -- manual ordering on gallery page
  featured boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index projects_status_idx on projects(status);
create index projects_category_idx on projects(category);
create index projects_featured_idx on projects(featured) where featured = true;
create index projects_client_idx on projects(client_id);
create index projects_slug_idx on projects(slug);

-- =====================================================================
-- PROJECT IMAGES — gallery images per project, with captions + ordering
-- =====================================================================
create table project_images (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  storage_path text not null,            -- supabase storage path
  public_url text not null,
  caption text,
  alt_text text,
  display_order int not null default 0,
  is_hero boolean default false,
  is_before_after_pair uuid references project_images(id),
  visibility text not null default 'public',  -- 'public' | 'client_only' | 'internal'
  width int,
  height int,
  created_at timestamptz not null default now()
);

create index project_images_project_idx on project_images(project_id, display_order);
create index project_images_visibility_idx on project_images(visibility);

-- =====================================================================
-- PROJECT MILESTONES — phased timeline visible to client
-- =====================================================================
create table project_milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status milestone_status not null default 'pending',
  display_order int not null default 0,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_milestones_project_idx on project_milestones(project_id, display_order);

-- =====================================================================
-- PROJECT UPDATES — progress posts (photos + text) for the client portal
-- =====================================================================
create table project_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  title text not null,
  body text,
  visibility text not null default 'client',  -- 'client' | 'public' | 'internal'
  created_at timestamptz not null default now()
);

create index project_updates_project_idx on project_updates(project_id, created_at desc);

create table project_update_images (
  id uuid primary key default uuid_generate_v4(),
  update_id uuid not null references project_updates(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  caption text,
  display_order int not null default 0
);

-- =====================================================================
-- PROJECT DOCUMENTS — contracts, plans, permits, invoices
-- =====================================================================
create table project_documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  storage_path text not null,
  file_type text,
  file_size_bytes bigint,
  category text,                         -- 'contract' | 'plan' | 'permit' | 'invoice' | 'other'
  visibility text not null default 'client', -- 'client' | 'internal'
  created_at timestamptz not null default now()
);

create index project_documents_project_idx on project_documents(project_id, created_at desc);

-- =====================================================================
-- PROJECT MESSAGES — threaded comms between admin + client
-- =====================================================================
create table project_messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  attachments jsonb default '[]'::jsonb,
  read_by jsonb default '[]'::jsonb,     -- array of user ids who've read
  created_at timestamptz not null default now()
);

create index project_messages_project_idx on project_messages(project_id, created_at desc);

-- =====================================================================
-- PROJECT CHANGE ORDERS
-- =====================================================================
create table change_orders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null,                   -- CO #1, #2, etc per project
  title text not null,
  description text not null,
  cost_impact numeric(10, 2),
  schedule_impact_days int,
  status change_order_status not null default 'draft',
  created_by uuid references profiles(id) on delete set null,
  client_signed_at timestamptz,
  client_signed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, number)
);

create index change_orders_project_idx on change_orders(project_id);

-- =====================================================================
-- TESTIMONIALS
-- =====================================================================
create table testimonials (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null,
  client_title text,                     -- "Homeowner, Augusta GA"
  quote text not null,
  rating int check (rating >= 1 and rating <= 5),
  project_id uuid references projects(id) on delete set null,
  avatar_url text,
  published boolean not null default false,
  featured boolean not null default false,
  display_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testimonials_published_idx on testimonials(published) where published = true;

-- =====================================================================
-- CONSULTATIONS — booked discovery calls / site visits
-- =====================================================================
create table consultations (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email citext not null,
  phone text,
  preferred_date date,
  preferred_time_window text,            -- 'morning' | 'afternoon' | 'evening'
  meeting_type text not null default 'phone', -- 'phone' | 'video' | 'in_person' | 'site_visit'
  project_type project_category,
  project_location text,
  notes text,
  status consultation_status not null default 'requested',
  confirmed_at timestamptz,
  confirmed_for timestamptz,             -- final scheduled datetime
  assigned_to uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consultations_status_idx on consultations(status);
create index consultations_date_idx on consultations(confirmed_for);

-- =====================================================================
-- SERVICES — CMS-managed service offerings (currently hardcoded)
-- =====================================================================
create table services (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  short_description text not null,
  full_description text,
  icon text,                             -- icon name or path
  display_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- SUBCONTRACTORS — vendor directory (extended profile for sub users)
-- =====================================================================
create table subcontractors (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid unique references profiles(id) on delete cascade,
  company_name text not null,
  trade text not null,                   -- 'electrical' | 'plumbing' | 'framing' | etc
  license_number text,
  insurance_expires date,
  preferred boolean default false,
  rating numeric(3, 2),                  -- avg rating 0.00-5.00
  active boolean default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subcontractors_trade_idx on subcontractors(trade);

-- =====================================================================
-- BID REQUESTS — RFQs sent to subcontractors
-- =====================================================================
create table bid_requests (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  scope_of_work text not null,
  trade text not null,
  attachments jsonb default '[]'::jsonb,
  bid_deadline timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index bid_requests_project_idx on bid_requests(project_id);

create table bids (
  id uuid primary key default uuid_generate_v4(),
  bid_request_id uuid not null references bid_requests(id) on delete cascade,
  subcontractor_id uuid not null references subcontractors(id) on delete cascade,
  amount numeric(12, 2),
  notes text,
  status bid_status not null default 'invited',
  submitted_at timestamptz,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bid_request_id, subcontractor_id)
);

create index bids_status_idx on bids(status);
create index bids_subcontractor_idx on bids(subcontractor_id);

-- =====================================================================
-- SITE SETTINGS — global CMS content (hero copy, contact info, etc.)
-- =====================================================================
create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

-- =====================================================================
-- AUDIT LOG — track sensitive admin actions
-- =====================================================================
create table audit_log (
  id bigserial primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on audit_log(actor_id, created_at desc);

-- =====================================================================
-- UPDATED_AT TRIGGER
-- =====================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select table_name
    from information_schema.columns
    where column_name = 'updated_at'
      and table_schema = 'public'
  loop
    execute format(
      'drop trigger if exists set_updated_at_%I on %I; create trigger set_updated_at_%I before update on %I for each row execute function set_updated_at();',
      t, t, t, t
    );
  end loop;
end;
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table leads enable row level security;
alter table projects enable row level security;
alter table project_images enable row level security;
alter table project_milestones enable row level security;
alter table project_updates enable row level security;
alter table project_update_images enable row level security;
alter table project_documents enable row level security;
alter table project_messages enable row level security;
alter table change_orders enable row level security;
alter table testimonials enable row level security;
alter table consultations enable row level security;
alter table services enable row level security;
alter table subcontractors enable row level security;
alter table bid_requests enable row level security;
alter table bids enable row level security;
alter table site_settings enable row level security;
alter table audit_log enable row level security;

-- PROFILES ------------------------------------------------------------
create policy "Own profile read" on profiles
  for select using (auth.uid() = id);
create policy "Admin reads all profiles" on profiles
  for select using (public.is_admin());
create policy "Own profile update" on profiles
  for update using (auth.uid() = id);
create policy "Admin updates all profiles" on profiles
  for update using (public.is_admin());
create policy "Admin inserts profiles" on profiles
  for insert with check (public.is_admin());

-- LEADS ---------------------------------------------------------------
-- Public can INSERT (form submission); only admin can read/update.
create policy "Anyone can submit a lead" on leads
  for insert with check (true);
create policy "Admin reads leads" on leads
  for select using (public.is_admin());
create policy "Admin updates leads" on leads
  for update using (public.is_admin());
create policy "Admin deletes leads" on leads
  for delete using (public.is_admin());

-- PROJECTS ------------------------------------------------------------
-- Public read for non-draft projects; admin full access; clients see their own.
create policy "Public reads published projects" on projects
  for select using (status <> 'draft');
create policy "Admin manages projects" on projects
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own project" on projects
  for select using (client_id = auth.uid());

-- PROJECT IMAGES ------------------------------------------------------
create policy "Public reads public images" on project_images
  for select using (
    visibility = 'public'
    and exists (select 1 from projects p where p.id = project_id and p.status <> 'draft')
  );
create policy "Admin manages images" on project_images
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads project images" on project_images
  for select using (
    visibility in ('public', 'client_only')
    and exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- PROJECT MILESTONES (client-facing) ----------------------------------
create policy "Admin manages milestones" on project_milestones
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own milestones" on project_milestones
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- PROJECT UPDATES + IMAGES --------------------------------------------
create policy "Admin manages updates" on project_updates
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own project updates" on project_updates
  for select using (
    visibility in ('client', 'public')
    and exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );
create policy "Public reads public updates" on project_updates
  for select using (
    visibility = 'public'
    and exists (select 1 from projects p where p.id = project_id and p.status <> 'draft')
  );

create policy "Admin manages update images" on project_update_images
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own update images" on project_update_images
  for select using (
    exists (
      select 1 from project_updates u
      join projects p on p.id = u.project_id
      where u.id = update_id and p.client_id = auth.uid()
    )
  );

-- PROJECT DOCUMENTS ---------------------------------------------------
create policy "Admin manages documents" on project_documents
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own documents" on project_documents
  for select using (
    visibility = 'client'
    and exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- PROJECT MESSAGES — threaded comms -----------------------------------
create policy "Admin reads + writes all messages" on project_messages
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own project messages" on project_messages
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );
create policy "Client writes to own project" on project_messages
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- CHANGE ORDERS -------------------------------------------------------
create policy "Admin manages change orders" on change_orders
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Client reads own change orders" on change_orders
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );
create policy "Client signs change orders" on change_orders
  for update using (
    exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- TESTIMONIALS --------------------------------------------------------
create policy "Public reads published testimonials" on testimonials
  for select using (published = true);
create policy "Admin manages testimonials" on testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- CONSULTATIONS -------------------------------------------------------
create policy "Anyone can book a consultation" on consultations
  for insert with check (true);
create policy "Admin manages consultations" on consultations
  for all using (public.is_admin()) with check (public.is_admin());

-- SERVICES ------------------------------------------------------------
create policy "Public reads published services" on services
  for select using (published = true);
create policy "Admin manages services" on services
  for all using (public.is_admin()) with check (public.is_admin());

-- SUBCONTRACTORS ------------------------------------------------------
create policy "Admin manages subs" on subcontractors
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Sub reads own record" on subcontractors
  for select using (profile_id = auth.uid());
create policy "Sub updates own record" on subcontractors
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- BID REQUESTS --------------------------------------------------------
create policy "Admin manages bid requests" on bid_requests
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Sub reads invited bid requests" on bid_requests
  for select using (
    exists (
      select 1 from bids b
      join subcontractors s on s.id = b.subcontractor_id
      where b.bid_request_id = bid_requests.id
        and s.profile_id = auth.uid()
    )
  );

-- BIDS ----------------------------------------------------------------
create policy "Admin manages bids" on bids
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Sub reads own bids" on bids
  for select using (
    exists (
      select 1 from subcontractors s
      where s.id = subcontractor_id and s.profile_id = auth.uid()
    )
  );
create policy "Sub updates own bids" on bids
  for update using (
    exists (
      select 1 from subcontractors s
      where s.id = subcontractor_id and s.profile_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from subcontractors s
      where s.id = subcontractor_id and s.profile_id = auth.uid()
    )
  );

-- SITE SETTINGS -------------------------------------------------------
create policy "Public reads site settings" on site_settings
  for select using (true);
create policy "Admin manages site settings" on site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- AUDIT LOG -----------------------------------------------------------
create policy "Admin reads audit log" on audit_log
  for select using (public.is_admin());
create policy "Anyone authenticated can append audit log" on audit_log
  for insert with check (auth.uid() is not null);

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
insert into storage.buckets (id, name, public)
values
  ('project-images', 'project-images', true),
  ('project-documents', 'project-documents', false),
  ('project-updates', 'project-updates', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies: project-images bucket (public read)
create policy "Public reads project images" on storage.objects
  for select using (bucket_id = 'project-images');
create policy "Admin uploads project images" on storage.objects
  for insert with check (bucket_id = 'project-images' and public.is_admin());
create policy "Admin updates project images" on storage.objects
  for update using (bucket_id = 'project-images' and public.is_admin());
create policy "Admin deletes project images" on storage.objects
  for delete using (bucket_id = 'project-images' and public.is_admin());

-- Storage policies: project-documents bucket (private, role-gated)
create policy "Admin manages documents storage" on storage.objects
  for all using (bucket_id = 'project-documents' and public.is_admin())
  with check (bucket_id = 'project-documents' and public.is_admin());

-- =====================================================================
-- SEED: default site settings + services
-- =====================================================================
insert into site_settings (key, value) values
  ('hero', '{"eyebrow": "Augusta, Georgia", "headline": "Building What Endures", "subline": "Custom homes and commercial construction rooted in craft, precision, and a commitment to structures that stand the test of time."}'::jsonb),
  ('contact', '{"email": "construction@8thandexchange.com", "phone": null, "city": "Augusta, Georgia", "service_area": ["Augusta", "Evans", "Martinez", "Grovetown", "North Augusta", "Columbia County", "Aiken"]}'::jsonb),
  ('stats', '[{"value": "25+", "label": "Years Combined Experience"}, {"value": "100%", "label": "Owner Involvement"}, {"value": "0", "label": "Corners Cut"}, {"value": "1", "label": "Standard: Excellence"}]'::jsonb)
on conflict (key) do nothing;

insert into services (slug, name, short_description, display_order) values
  ('custom-homes', 'Custom Homes', 'From blueprint to move-in day. We build residences that reflect your vision — with the structural integrity and finish quality that make a house a legacy.', 1),
  ('residential-renovations', 'Residential Renovations', 'Kitchen and bath remodels, additions, whole-home renovations, and historic restorations. We transform existing spaces while respecting their bones.', 2),
  ('commercial-construction', 'Commercial Construction', 'Ground-up commercial builds — office, retail, mixed-use, and light industrial. Built to code, built to spec, and built to perform for decades.', 3),
  ('tenant-buildouts', 'Tenant Buildouts', 'Tenant improvements and adaptive reuse that transform existing commercial spaces — on time, on budget, and with minimal disruption.', 4),
  ('pre-construction', 'Pre-Construction', 'Value engineering, feasibility studies, and detailed cost analysis before the first shovel breaks ground. Better planning means better outcomes.', 5),
  ('design-build', 'Design-Build', 'Single-source accountability from concept to completion. One team, one vision, one point of contact — for both residential and commercial projects.', 6)
on conflict (slug) do nothing;
