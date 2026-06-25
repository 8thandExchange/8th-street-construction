-- Client-facing build progress share links — password-gated, per project
-- The public share page reads project data via the service-role client only
-- AFTER a correct password is supplied, so no new public RLS policy is needed.

set search_path = public, extensions;

alter table projects
  add column if not exists share_token text unique,
  add column if not exists share_password_hash text,
  add column if not exists share_enabled boolean not null default false,
  add column if not exists share_updated_at timestamptz;

create index if not exists projects_share_token_idx on projects(share_token)
  where share_token is not null;

comment on column projects.share_token is 'Public, unguessable slug used in /share/<token> progress links.';
comment on column projects.share_password_hash is 'scrypt hash (scrypt$salt$key) gating the public share page.';
comment on column projects.share_enabled is 'Whether the password-gated public progress page is live.';
