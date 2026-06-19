-- 608 Macon Avenue — public portfolio record
-- Safe to re-run: upserts on slug. Does not delete anything.
--
-- Page copy and layout: src/lib/projects/macon-608-content.ts
-- Square footage omitted — not confirmed for 608.
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
  meta_description,
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
  'A custom home, documented from the ground up.',
  'custom_home',
  'in_progress',
  'A custom home in Augusta, documented from the ground up.',
  '608 Macon Avenue — a custom home in Augusta, documented from the ground up by 8th Street Construction. Watch the build unfold milestone by milestone.',
  null,
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
  meta_description = excluded.meta_description,
  narrative = excluded.narrative,
  hero_image_url = excluded.hero_image_url,
  location = excluded.location,
  street_address = excluded.street_address,
  jurisdiction = excluded.jurisdiction,
  display_order = excluded.display_order,
  featured = excluded.featured,
  published_at = coalesce(projects.published_at, excluded.published_at),
  updated_at = now();
