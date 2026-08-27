-- Tear down the claimless-session bridge on client/user policies.
--
-- The group 2-4 re-keying appended "(org_id = current_org_id() OR
-- current_org_id() IS NULL)" to every client/sub/owner policy so sessions
-- minted before the org claim existed kept working. The claim plumbing is
-- now complete: every auth user carries the org_id app_metadata claim
-- (stamped across existing users by the kickoff migration and at
-- provisioning by provisionPortalUser), so a claimless authenticated
-- session no longer occurs in practice — and the escape hatch is a
-- cross-tenant read waiting to happen, because a session that somehow
-- lacked a claim would pass the org conjunct on every tenant's rows.
--
-- Mechanical rewrite: every policy whose expression contains the exact
-- bridge disjunction (as deparsed by pg_policies) has it replaced with the
-- bare org equality, preserving the rest of the expression verbatim. The
-- count is asserted so a drifted policy set fails loud instead of leaving
-- a hatch open: 40 = the 38 client/sub/owner USING clauses plus the two
-- UPDATE/ALL policies whose WITH CHECK also carries it (subcontractors,
-- push_subscriptions). The admin-side is_admin() bridge is a different
-- bridge (platform-admin access, no IS NULL hatch) and is untouched.

do $$
declare
  bridge constant text :=
    '((org_id = ( SELECT current_org_id() AS current_org_id)) OR (( SELECT current_org_id() AS current_org_id) IS NULL))';
  tight constant text :=
    '(org_id = ( SELECT current_org_id() AS current_org_id))';
  -- The escape hatch on its own, for the post-check: matching this alone
  -- avoids false positives from policies whose original expression happens
  -- to contain an unrelated IS NULL (e.g. deleted_at IS NULL) after an
  -- org_id mention.
  hatch constant text :=
    '(( SELECT current_org_id() AS current_org_id) IS NULL)';
  p record;
  altered int := 0;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (strpos(qual, bridge) > 0
           or strpos(coalesce(with_check, ''), bridge) > 0)
  loop
    if strpos(p.qual, bridge) > 0
       and strpos(coalesce(p.with_check, ''), bridge) > 0 then
      execute format(
        'alter policy %I on public.%I using (%s) with check (%s)',
        p.policyname, p.tablename,
        replace(p.qual, bridge, tight),
        replace(p.with_check, bridge, tight));
    elsif strpos(p.qual, bridge) > 0 then
      execute format(
        'alter policy %I on public.%I using (%s)',
        p.policyname, p.tablename,
        replace(p.qual, bridge, tight));
    else
      execute format(
        'alter policy %I on public.%I with check (%s)',
        p.policyname, p.tablename,
        replace(p.with_check, bridge, tight));
    end if;
    altered := altered + 1;
  end loop;

  if altered <> 40 then
    raise exception 'bridge teardown expected 40 policies, altered %', altered;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and (strpos(coalesce(qual, ''), hatch) > 0
           or strpos(coalesce(with_check, ''), hatch) > 0)
  ) then
    raise exception 'bridge escape hatch still present after teardown';
  end if;
end $$;
