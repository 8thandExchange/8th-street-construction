-- =====================================================================
-- 2026-07-12 — Stop exposing internal project columns to anonymous reads.
--
-- The "Public reads published projects" policy is row-level only, so anon
-- could read contract_value, internal_notes, client_id, and
-- project_manager_id on every non-draft project. Public pages now select
-- explicit columns (see src/app/projects/[slug]/page.tsx), so anon can be
-- limited to the portfolio-safe column set.
--
-- ORDER MATTERS: apply this only AFTER the code that removes
-- select("*")-as-anon is deployed, or public project pages will 500.
-- =====================================================================

revoke select on table public.projects from anon;
grant select (
  id, slug, title, subtitle, category, status,
  excerpt, narrative, hero_image_url, location,
  year_completed, square_footage, budget_range,
  meta_description, display_order, featured,
  start_date, target_completion_date, actual_completion_date,
  created_at, updated_at, published_at
) on table public.projects to anon;
