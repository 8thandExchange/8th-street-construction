-- Identity-as-data, slice 1: known client organizations become a table.
--
-- KNOWN_CLIENT_ORGS was a hardcoded array in src/lib/project/funding.ts —
-- one entry, Habitat CSRA, with the quick-assign card and the
-- HUD-notes boilerplate baked into code. Per the tenancy design's
-- identity-as-data step, each org now owns its client-organization
-- directory. Content-free by design: the Habitat row is seeded
-- operationally (the seed-scrub step collects per-org seeds into a
-- script), never in migration history.
--
-- Standard org-owned shape, post-bridge-teardown (no claimless hatch).
-- The unique (org_id, slug) index also serves org_id lookups, so no
-- separate org index is needed.

create table public.client_orgs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  slug text not null,
  name text not null,
  email text not null,
  description text,
  default_funding text not null default 'private'
    check (default_funding in ('private', 'habitat', 'hud_home')),
  -- Program boilerplate stamped into hud_program_notes on quick assign.
  default_hud_notes text,
  -- Show the one-click assign card on Job Details.
  quick_assign boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);

alter table public.client_orgs enable row level security;

create trigger client_orgs_default_org
  before insert on public.client_orgs
  for each row execute function public.fill_default_org_id();

create policy "Org admin manages client orgs" on public.client_orgs
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );
