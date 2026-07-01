-- Client organizations + HUD HOME funding classification
-- Augusta-Richmond County is a HUD HOME entitlement jurisdiction.
-- Habitat/CSRA builds may use ARC HOME pass-through or Georgia DCA CHIP (federal HOME).

create type project_funding_type as enum (
  'private',
  'habitat',
  'hud_home'
);

alter table profiles
  add column if not exists organization_name text,
  add column if not exists organization_slug text;

alter table projects
  add column if not exists funding_type project_funding_type not null default 'private',
  add column if not exists hud_grant_year int,
  add column if not exists hud_program_notes text;

create index if not exists projects_funding_type_idx on projects(funding_type);
create index if not exists profiles_org_slug_idx on profiles(organization_slug) where organization_slug is not null;

comment on column projects.funding_type is 'private = market/custom; habitat = Habitat partner (non-HUD subsidized); hud_home = HUD HOME or DCA CHIP funded';
comment on column projects.hud_grant_year is 'Fiscal or program year for HUD/CHIP award tracking';
comment on column profiles.organization_slug is 'e.g. habitat-augusta — used for quick client assignment';

-- Habitat Augusta profile metadata
update profiles
set
  organization_name = 'Augusta/CSRA Habitat for Humanity',
  organization_slug = 'habitat-augusta',
  first_name = coalesce(nullif(trim(first_name), ''), 'Habitat'),
  last_name = coalesce(nullif(trim(last_name), ''), 'Augusta')
where email = 'habitat@habitataugusta.org';

-- 608 Macon — primary Habitat HUD HOME build
update projects
set
  client_id = (select id from profiles where email = 'habitat@habitataugusta.org' limit 1),
  funding_type = 'hud_home',
  hud_grant_year = 2026,
  hud_program_notes = 'Augusta-Richmond County HOME / DCA CHIP — income-eligible homebuyer, sweat equity, EER required.'
where slug = '608-macon-ave';
