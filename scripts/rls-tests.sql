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

-- ── Bridge trigger, single-org era (must run BEFORE fixture orgs exist) ──
-- With exactly one organization, an insert without org_id is filled in.

do $$
declare
  filled uuid;
  the_org uuid;
begin
  select id into strict the_org from public.organizations;
  insert into public.leads (first_name, last_name, email, message)
  values ('RLS', 'Probe', 'rls-trigger-probe@example.invalid', 'harness probe')
  returning org_id into filled;
  if filled is distinct from the_org then
    raise exception 'fill_default_org_id did not assign the single org (got %)', filled;
  end if;
  delete from public.leads where email = 'rls-trigger-probe@example.invalid';
end $$;

-- ── Fixtures ─────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a001', 'rls-t1-admin@example.invalid'),
  ('00000000-0000-4000-8000-00000000c001', 'rls-t1-client@example.invalid'),
  ('00000000-0000-4000-8000-00000000a002', 'rls-t2-admin@example.invalid'),
  ('00000000-0000-4000-8000-00000000b001', 'rls-t1-orgadmin@example.invalid');

insert into public.profiles (id, email, role, portal_active) values
  ('00000000-0000-4000-8000-00000000a001', 'rls-t1-admin@example.invalid', 'admin', false),
  -- portal_active so the t1 client exercises client_has_project_portal_access.
  ('00000000-0000-4000-8000-00000000c001', 'rls-t1-client@example.invalid', 'client', true),
  ('00000000-0000-4000-8000-00000000a002', 'rls-t2-admin@example.invalid', 'admin', false),
  -- Org-admin WITHOUT platform admin: profiles.role stays client, so only
  -- the org-scoped policy arm can admit them — the purest tenancy probe.
  ('00000000-0000-4000-8000-00000000b001', 'rls-t1-orgadmin@example.invalid', 'client', false);

insert into public.organizations (id, slug, legal_name, display_name) values
  ('00000000-0000-4000-8000-0000000000f1', 'rls-test-tenant-1', 'RLS Test Tenant 1 LLC', 'Tenant 1'),
  ('00000000-0000-4000-8000-0000000000f2', 'rls-test-tenant-2', 'RLS Test Tenant 2 LLC', 'Tenant 2');

insert into public.org_members (org_id, user_id, role, staff_scope) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000a001', 'admin', 'full'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000c001', 'client', null),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000a002', 'admin', 'full'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000b001', 'admin', 'full');

-- One lead per tenant, keyed explicitly.
insert into public.leads (org_id, first_name, last_name, email, message) values
  ('00000000-0000-4000-8000-0000000000f1', 'Lead', 'One', 'rls-lead-t1@example.invalid', 't1'),
  ('00000000-0000-4000-8000-0000000000f2', 'Lead', 'Two', 'rls-lead-t2@example.invalid', 't2');

-- Group 2 fixtures: one DRAFT project per tenant with a client-visible
-- document, plus portal membership for the t1 client on the t1 project.
-- Draft status keeps the anon/public "published projects" policy out of
-- play, so the org-scoped and portal arms are the only admission paths.
insert into public.projects (id, org_id, slug, title, category, status) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000f1',
   'rls-test-project-t1', 'RLS Project T1', 'custom_home', 'draft'),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000f2',
   'rls-test-project-t2', 'RLS Project T2', 'custom_home', 'draft');

insert into public.project_documents (org_id, project_id, title, storage_path, visibility) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000d1',
   'RLS Doc T1', 'rls-test/t1.pdf', 'client'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000d2',
   'RLS Doc T2', 'rls-test/t2.pdf', 'client');

insert into public.project_portal_members (org_id, project_id, profile_id, portal_enabled) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000d1',
   '00000000-0000-4000-8000-00000000c001', true);

-- Group 3 fixtures: one vendor per tenant, and a t1 subcontractor owned by
-- the t1 client profile (doubling as the sub self-access probe).
insert into public.vendors (org_id, name) values
  ('00000000-0000-4000-8000-0000000000f1', 'RLS Vendor T1'),
  ('00000000-0000-4000-8000-0000000000f2', 'RLS Vendor T2');

insert into public.subcontractors (org_id, company_name, trade, profile_id) values
  ('00000000-0000-4000-8000-0000000000f1', 'RLS Sub T1', 'framing',
   '00000000-0000-4000-8000-00000000c001');

-- Group 4 fixtures: one invoice per tenant, on each tenant's project.
insert into public.invoices (org_id, project_id, invoice_number) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000d1', 'RLS-T1-001'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000d2', 'RLS-T2-001');

-- site_settings fixture: the same key in both tenants, distinguishable
-- values — the (org_id, key) PK is the point.
insert into public.site_settings (org_id, key, value) values
  ('00000000-0000-4000-8000-0000000000f1', 'rls_probe', '{"tenant": 1}'),
  ('00000000-0000-4000-8000-0000000000f2', 'rls_probe', '{"tenant": 2}');

-- ── Bridge trigger, multi-org era: guessing a tenant must fail loud ──────

do $$
begin
  begin
    insert into public.leads (first_name, last_name, email, message)
    values ('RLS', 'Probe2', 'rls-trigger-probe2@example.invalid', 'must fail');
    raise exception 'insert without org_id succeeded with multiple orgs present';
  exception
    when too_many_rows then null; -- correct: refuse to guess the tenant
  end;
end $$;

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
  foreach t in array array['vendors', 'vendor_bills', 'invoices', 'organizations', 'org_members',
                           'project_documents', 'project_contracts', 'meetings', 'client_orgs']
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
  if (select count(*) from public.leads) <> 0 then
    raise exception 'RLS: client can read leads';
  end if;
end $$;

reset role;

-- ── Cross-tenant isolation on re-keyed tables (group 1: leads) ───────────
-- The org-admin-without-platform-admin can only be admitted by the
-- org-scoped policy arm, so what they see IS the tenancy boundary.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if (select count(*) from public.leads) <> 1
     or (select email from public.leads limit 1) <> 'rls-lead-t1@example.invalid' then
    raise exception 'RLS: org admin of tenant 1 must see exactly tenant 1''s lead, saw %',
      (select count(*) from public.leads);
  end if;
end $$;

-- The same person with a claim for an org they do not belong to sees nothing.
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if (select count(*) from public.leads) <> 0 then
    raise exception 'RLS: cross-tenant lead read through a non-member claim';
  end if;
end $$;

reset role;

-- ── Cross-tenant isolation on re-keyed tables (group 2: projects) ────────
-- Draft projects are invisible to the public policy, so the org-admin arm
-- is the only way the t1 org admin (who is NOT a platform admin) sees them.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if (select count(*) from public.projects where status = 'draft') <> 1
     or (select slug from public.projects where status = 'draft' limit 1) <> 'rls-test-project-t1' then
    raise exception 'RLS: t1 org admin must see exactly t1''s draft project, saw %',
      (select count(*) from public.projects where status = 'draft');
  end if;
  if (select count(*) from public.project_documents) <> 1
     or (select title from public.project_documents limit 1) <> 'RLS Doc T1' then
    raise exception 'RLS: t1 org admin must see exactly t1''s document, saw %',
      (select count(*) from public.project_documents);
  end if;
end $$;

-- Same person claiming the org they do not belong to: nothing.
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if (select count(*) from public.projects where status = 'draft') <> 0 then
    raise exception 'RLS: cross-tenant draft project read through a non-member claim';
  end if;
  if (select count(*) from public.project_documents) <> 0 then
    raise exception 'RLS: cross-tenant project document read through a non-member claim';
  end if;
end $$;

reset role;

-- ── Cross-tenant isolation on re-keyed tables (group 3: vendors) ─────────

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if (select count(*) from public.vendors) <> 1
     or (select name from public.vendors limit 1) <> 'RLS Vendor T1' then
    raise exception 'RLS: t1 org admin must see exactly t1''s vendor, saw %',
      (select count(*) from public.vendors);
  end if;
end $$;

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if (select count(*) from public.vendors) <> 0 then
    raise exception 'RLS: cross-tenant vendor read through a non-member claim';
  end if;
end $$;

reset role;

-- ── Cross-tenant isolation on re-keyed tables (group 4: invoices) ────────
-- The money boundary: the t1 org admin (not a platform admin) sees exactly
-- t1's invoice, and the same identity under a t2 claim sees none.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if (select count(*) from public.invoices where invoice_number like 'RLS-%') <> 1
     or (select invoice_number from public.invoices where invoice_number like 'RLS-%' limit 1)
        <> 'RLS-T1-001' then
    raise exception 'RLS: t1 org admin must see exactly t1''s invoice, saw %',
      (select count(*) from public.invoices where invoice_number like 'RLS-%');
  end if;
end $$;

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if (select count(*) from public.invoices) <> 0 then
    raise exception 'RLS: cross-tenant invoice read through a non-member claim';
  end if;
end $$;

reset role;

-- ── site_settings: (org_id, key) tenancy + public read allow-list ────────
-- The org admin sees exactly their tenant's row of a key both tenants
-- hold, and an update aimed at the other tenant's row hits nothing.
-- Anonymous readers keep the marketing keys the public site renders
-- (hero, stats, contact) and never see anything else.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
declare
  touched int;
begin
  if (select count(*) from public.site_settings where key = 'rls_probe') <> 1
     or (select value->>'tenant' from public.site_settings where key = 'rls_probe') <> '1' then
    raise exception 'RLS: t1 org admin must see exactly t1''s rls_probe setting';
  end if;
  update public.site_settings set value = '{"tenant": 2, "touched": true}'
  where org_id = '00000000-0000-4000-8000-0000000000f2' and key = 'rls_probe';
  get diagnostics touched = row_count;
  if touched <> 0 then
    raise exception 'RLS: cross-tenant site_settings update touched % rows', touched;
  end if;
end $$;

reset role;

set local role anon;
set local request.jwt.claims = '{}';

do $$
begin
  if (select count(*) from public.site_settings where key = 'rls_probe') <> 0 then
    raise exception 'RLS: anon can read non-marketing site settings';
  end if;
  if (select count(*) from public.site_settings where key = 'contact') < 1 then
    raise exception 'RLS: anon lost the public contact setting the marketing site renders';
  end if;
  if (select count(*) from public.site_settings where key = 'identity') < 1 then
    raise exception 'RLS: anon lost the public identity setting brand surfaces render';
  end if;
end $$;

reset role;

-- ── Sub self-access survives the org conjunct ────────────────────────────
-- The t1 client profile owns a subcontractor record: readable under the
-- matching claim, gone under a foreign-org claim.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000c001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if (select count(*) from public.subcontractors) <> 1
     or (select company_name from public.subcontractors limit 1) <> 'RLS Sub T1' then
    raise exception 'RLS: sub must read exactly their own record';
  end if;
end $$;

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000c001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if (select count(*) from public.subcontractors) <> 0 then
    raise exception 'RLS: sub self-access leaked across a foreign-org claim';
  end if;
end $$;

reset role;

-- ── Portal client path survives the org conjunct ─────────────────────────
-- The t1 client is a portal member of the t1 project with portal_active,
-- so client_has_project_portal_access admits them — but only inside the
-- org their claim names.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000c001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f1"}}';

do $$
begin
  if (select count(*) from public.projects where status = 'draft') <> 1 then
    raise exception 'RLS: portal client must see their project through the portal arm';
  end if;
  if (select count(*) from public.project_documents) <> 1
     or (select title from public.project_documents limit 1) <> 'RLS Doc T1' then
    raise exception 'RLS: portal client must see exactly their client-visible document';
  end if;
end $$;

-- The same client under a foreign-org claim loses everything: membership
-- alone is not enough once the claim names another tenant.
set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000c001","role":"authenticated","app_metadata":{"org_id":"00000000-0000-4000-8000-0000000000f2"}}';

do $$
begin
  if (select count(*) from public.projects where status = 'draft') <> 0
     or (select count(*) from public.project_documents) <> 0 then
    raise exception 'RLS: portal membership leaked across a foreign-org claim';
  end if;
end $$;

-- ── Claimless sessions get nothing through the client arms ───────────────
-- The re-keying bridged client/sub/owner policies with "or current_org_id()
-- is null" so pre-claim sessions kept working. That hatch is torn down
-- (every auth user carries the claim; provisioning stamps it), so the same
-- portal member with NO org claim — a state no live session should be in —
-- must now read zero rows, not every tenant's.

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000c001","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.projects where status = 'draft') <> 0
     or (select count(*) from public.project_documents) <> 0
     or (select count(*) from public.subcontractors) <> 0
     or (select count(*) from public.invoices) <> 0 then
    raise exception 'RLS: claimless session read rows through a client arm after bridge teardown';
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
