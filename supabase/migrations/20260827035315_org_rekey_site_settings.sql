-- Re-key site_settings for tenancy: (org_id, key) primary key.
--
-- The last org-owned table, deferred through groups 1-4 because its PK had
-- to change shape. Same proven pattern: backfill the single org, NOT NULL,
-- fill trigger (fails loud with too_many_rows once a second org exists);
-- the admin policy becomes org-scoped TO authenticated with the is_admin()
-- bridge. No index needed beyond the new composite PK.
--
-- Written post-bridge-teardown (20260827024636), so no claimless escape
-- hatch: the org conjunct is bare.
--
-- The public read also tightens from USING (true) to the marketing keys
-- the public site actually renders (hero, stats, contact). Finance config
-- saved here later (approval_thresholds, month_close) was about to become
-- anonymously readable under the old policy; now only admins see it.
-- Extend the key list when a new setting is meant to be public.

alter table public.site_settings add column org_id uuid references public.organizations(id);
update public.site_settings set org_id = (select id from public.organizations);
alter table public.site_settings alter column org_id set not null;

alter table public.site_settings drop constraint site_settings_pkey;
alter table public.site_settings add constraint site_settings_pkey primary key (org_id, key);

create trigger site_settings_default_org
  before insert on public.site_settings
  for each row execute function public.fill_default_org_id();

drop policy "Admin manages site settings" on public.site_settings;

create policy "Org admin manages site settings" on public.site_settings
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Public reads site settings" on public.site_settings;

create policy "Public reads marketing settings" on public.site_settings
  for select
  using (key = any (array['hero', 'stats', 'contact']));
