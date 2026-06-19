-- 608 Macon Avenue — public portfolio record
-- Safe to re-run: upserts on slug. Does not delete anything.
--
-- Visibility rules (app + RLS):
--   status must NOT be 'draft' or 'archived'
--   /projects index also requires a card image (hero_image_url or known slug fallback)
--
-- Review this script, then run in Supabase SQL Editor or:
--   psql "$DATABASE_URL" -f scripts/sql/seed-608-macon-public.sql

insert into projects (
  slug,
  title,
  subtitle,
  category,
  status,
  excerpt,
  narrative,
  hero_image_url,
  location,
  street_address,
  jurisdiction,
  display_order,
  featured,
  published_at
) values (
  '608-macon-ave',
  '608 Macon Avenue',
  'Custom home under construction in Augusta',
  'custom_home',
  'in_progress',
  'Active custom home build in Augusta, Georgia.',
  E'PLACEHOLDER: project narrative\n\nReplace with approved copy.',
  '/img/projects/608-macon-ave.png',
  'Augusta, GA',
  '608 Macon Ave',
  'City of Augusta, Richmond County, GA',
  0,
  true,
  now()
)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  category = excluded.category,
  status = excluded.status,
  excerpt = excluded.excerpt,
  narrative = excluded.narrative,
  hero_image_url = excluded.hero_image_url,
  location = excluded.location,
  street_address = excluded.street_address,
  jurisdiction = excluded.jurisdiction,
  display_order = excluded.display_order,
  featured = excluded.featured,
  published_at = coalesce(projects.published_at, excluded.published_at),
  updated_at = now();
