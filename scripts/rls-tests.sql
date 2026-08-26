-- Row-level-security test harness — Phase 2 step 1 (docs/rollout/tenancy-design.md).
--
-- Run:  npm run test:rls        (needs SUPABASE_DB_URL, the session-pooler
--                                Postgres URL from Dashboard → Connect)
-- or:   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/rls-tests.sql
--
-- Everything happens inside one transaction that ROLLS BACK: fixtures never
-- persist and production data is never modified. Each DO block raises on a
-- violated expectation, which aborts the run with a non-zero exit.
--
-- The point of this harness is the tenancy re-keying ahead: every policy
-- rewrite must keep these green, and cross-tenant assertions get added per
-- table-group as org_id lands on it. Assertions marked BRIDGE encode the
-- current single-company semantics ("profiles.role = admin sees everything")
-- and are expected to CHANGE when the org-scoped rewrite replaces is_admin().

begin;

-- ── Fixtures ─────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a001', 'rls-t1-admin@example.invalid'),
  ('00000000-0000-4000-8000-00000000c001', 'rls-t1-client@example.invalid'),
  ('00000000-0000-4000-8000-00000000a002', 'rls-t2-admin@example.invalid');

insert into public.profiles (id, email, role) values
  ('00000000-0000-4000-8000-00000000a001', 'rls-t1-admin@example.invalid', 'admin'),
  ('00000000-0000-4000-8000-00000000c001', 'rls-t1-client@example.invalid', 'client'),
  ('00000000-0000-4000-8000-00000000a002', 'rls-t2-admin@example.invalid', 'admin');

insert into public.organizations (id, slug, legal_name, display_name) values
  ('00000000-0000-4000-8000-0000000000f1', 'rls-test-tenant-1', 'RLS Test Tenant 1 LLC', 'Tenant 1'),
  ('00000000-0000-4000-8000-0000000000f2', 'rls-test-tenant-2', 'RLS Test Tenant 2 LLC', 'Tenant 2');

insert into public.org_members (org_id, user_id, role, staff_scope) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000a001', 'admin', 'full'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000c001', 'client', null),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000a002', 'admin', 'full');

-- ── Anonymous callers see no operational or tenancy data ─────────────────

set local role anon;
set local request.jwt.claims = '{}';

-- Two acceptable outcomes per table: zero rows, or permission denied — the
-- advisor hardening revoked is_admin() from anon, so policies that call it
-- fail closed with 42501 instead of filtering to nothing. Any actual row is
-- a failure.
do $$
declare
  t text;
  n int;
begin
  foreach t in array array['vendors', 'vendor_bills', 'invoices', 'organizations', 'org_members']
  loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then
        raise exception 'RLS: anon can read % rows from %', n, t;
      end if;
    exception
      when insufficient_privilege then
        null; -- fails closed: revoked helper blocks the whole read
    end;
  end loop;
end $$;

reset role;

-- ── A client sees themself, their org, and no money data ─────────────────

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000c001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'RLS: client sees % profiles, expected exactly their own',
      (select count(*) from public.profiles);
  end if;
  if (select count(*) from public.organizations) <> 1
     or (select slug from public.organizations limit 1) <> 'rls-test-tenant-1' then
    raise exception 'RLS: client org visibility wrong — must be exactly their own org';
  end if;
  if (select count(*) from public.org_members) <> 1 then
    raise exception 'RLS: client sees memberships beyond their own';
  end if;
  if (select count(*) from public.vendor_bills) <> 0 then
    raise exception 'RLS: client can read vendor_bills';
  end if;
  if public.current_org_id() <> '00000000-0000-4000-8000-0000000000f1' then
    raise exception 'current_org_id() does not read the JWT org claim';
  end if;
  if public.is_org_admin() then
    raise exception 'is_org_admin() true for a client member';
  end if;
end $$;

reset role;

-- ── Org-admin checks are bound to the JWT claim, not just membership ─────

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if not public.is_org_admin() then
    raise exception 'is_org_admin() false for an admin member of the claimed org';
  end if;
end $$;

-- Same person claiming an org they are NOT a member of must fail the check.
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if public.is_org_admin() then
    raise exception 'is_org_admin() true for an org the caller does not belong to';
  end if;
  if public.current_org_id() <> '00000000-0000-4000-8000-0000000000f2' then
    raise exception 'current_org_id() not reading the active claim';
  end if;
end $$;

-- A missing claim resolves to null org and no admin rights anywhere.
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}';

do $$
begin
  if public.current_org_id() is not null then
    raise exception 'current_org_id() invented an org with no claim present';
  end if;
  if public.is_org_admin() then
    raise exception 'is_org_admin() true with no org claim';
  end if;
end $$;

reset role;

-- ── BRIDGE: profiles.role = admin still means company-wide access ────────
-- These encode today's single-company semantics. The tenancy re-keying will
-- flip them to org-scoped assertions table-group by table-group.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a002","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if not public.is_admin() then
    raise exception 'BRIDGE: profiles.role=admin no longer satisfies is_admin()';
  end if;
  -- Bridge reality: any profile-admin reads every org via "Admin manages
  -- organizations". Goes away with the org-scoped rewrite.
  if (select count(*) from public.organizations) < 2 then
    raise exception 'BRIDGE: platform admin org visibility changed unexpectedly';
  end if;
end $$;

reset role;

do $$ begin raise notice 'RLS tests passed.'; end $$;

rollback;
