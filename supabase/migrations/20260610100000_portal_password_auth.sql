set search_path = public, extensions;

-- =====================================================================
-- PORTAL PASSWORD AUTH — access requests + forced password change flag
-- =====================================================================

alter table profiles
  add column if not exists must_change_password boolean not null default false;

create type access_request_status as enum ('pending', 'approved', 'denied');

create table portal_access_requests (
  id uuid primary key default uuid_generate_v4(),
  email citext not null,
  first_name text,
  last_name text,
  requested_role user_role not null default 'client',
  portal_path text,
  message text,
  status access_request_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index portal_access_requests_status_idx on portal_access_requests(status, created_at desc);
create index portal_access_requests_email_idx on portal_access_requests(email);

alter table portal_access_requests enable row level security;

create policy "Admin manages access requests" on portal_access_requests
  for all using (public.is_admin()) with check (public.is_admin());
