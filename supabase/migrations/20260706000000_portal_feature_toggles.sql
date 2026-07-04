-- Per-project portal feature toggles. Empty object = everything on
-- (default), so existing projects are unaffected. A key set to false
-- hides that tab/page from the client portal for this project, e.g.
-- {"selections": false, "punch_list": false}.
alter table projects
  add column if not exists portal_features jsonb not null default '{}'::jsonb;
