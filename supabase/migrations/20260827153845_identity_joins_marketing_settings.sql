-- Identity-as-data, slice 3: the business identity becomes a marketing
-- setting.
--
-- BRAND in src/lib/brand/assets.ts hardcodes the company name, tagline,
-- parent line, phone, and email that public surfaces render (share pages,
-- vendor forms, billing headers, emails). Those surfaces serve anonymous
-- visitors, so the identity belongs with the other public marketing
-- content in site_settings — the org row is deliberately not readable by
-- anon. The 'identity' key joins the public-read allow-list; the row
-- itself is seeded operationally (seed-scrub rule: customer data stays
-- out of migration history) and edited from Admin -> Settings.

drop policy "Public reads marketing settings" on public.site_settings;

create policy "Public reads marketing settings" on public.site_settings
  for select
  using (key = any (array['hero', 'stats', 'contact', 'identity']));
