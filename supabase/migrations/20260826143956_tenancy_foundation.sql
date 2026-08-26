-- Phase 2 (multi-tenancy) step 1: the organization and membership model from
-- docs/rollout/tenancy-design.md. Deliberately additive — no existing table,
-- policy, or code path reads these yet, so the single-company deployment is
-- unchanged. The org key lands on the JWT now so every session already
-- carries it when the schema re-keying starts.

-- ── Organizations ────────────────────────────────────────────────────────

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  legal_name text not null,
  display_name text not null,
  address jsonb,
  phone text,
  reply_to_email text,
  sending_domain text,
  jurisdiction_default text,
  logo_path text,
  theme jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant record. One row per builder company; every org-owned table will gain an org_id referencing this.';

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function set_updated_at();

-- ── Membership ───────────────────────────────────────────────────────────
-- role and staff_scope will MIGRATE here from profiles (a person can belong
-- to several orgs in different roles). During the bridge both are written;
-- profiles stays the read path until the RLS rewrite lands.

create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role user_role not null,
  staff_scope text
    check (staff_scope is null or staff_scope in ('full', 'project_manager', 'superintendent', 'accounting')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

comment on table public.org_members is
  'Who belongs to which tenant, as what. Successor to profiles.role/staff_scope once the RLS rewrite lands.';

create index idx_org_members_user_id on public.org_members (user_id);

-- ── Org claim helpers ────────────────────────────────────────────────────
-- The active org travels in the JWT (app_metadata.org_id). One stable helper
-- reads it so policies initplan it once per query.

create or replace function public.current_org_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(((select auth.jwt()) -> 'app_metadata' ->> 'org_id'), '')::uuid
$$;

create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = public.current_org_id()
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  )
$$;

-- Same grant hygiene as the 20260822153857 advisor hardening: signed-in
-- callers may use the helpers, anonymous Data API callers may not.
revoke execute on function public.current_org_id() from anon, public;
revoke execute on function public.is_org_admin() from anon, public;
grant execute on function public.current_org_id() to authenticated, service_role;
grant execute on function public.is_org_admin() to authenticated, service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

create policy "Members read own organization" on public.organizations
  for select using (
    exists (
      select 1 from public.org_members m
      where m.org_id = organizations.id and m.user_id = (select auth.uid())
    )
  );

create policy "Admin manages organizations" on public.organizations
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Members read own memberships" on public.org_members
  for select using (user_id = (select auth.uid()));

create policy "Admin manages memberships" on public.org_members
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Backfill: 8th Street is tenant #1 ────────────────────────────────────

insert into public.organizations
  (slug, legal_name, display_name, phone, reply_to_email, jurisdiction_default)
values (
  '8th-street-construction',
  '8th Street Construction, LLC',
  '8th Street Construction',
  '(706) 550-9581',
  'construction@8thandexchange.com',
  'augusta-richmond-ga'
);

insert into public.org_members (org_id, user_id, role, staff_scope)
select o.id, p.id, p.role, case when p.role = 'admin' then p.staff_scope end
from public.profiles p
cross join public.organizations o
where o.slug = '8th-street-construction'
on conflict (org_id, user_id) do nothing;

-- Stamp the org claim into app_metadata for every existing user; it reaches
-- their JWT on the next token refresh. New users get it at provisioning.
update auth.users u
set raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('org_id', o.id::text)
from public.profiles p, public.organizations o
where u.id = p.id and o.slug = '8th-street-construction';
