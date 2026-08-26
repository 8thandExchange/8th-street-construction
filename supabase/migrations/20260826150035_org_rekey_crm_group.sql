-- Phase 2 re-keying, table group 1 of N: leads, consultations, testimonials
-- (the low-risk CRM/marketing edges — the pattern gets proven here before it
-- reaches the money tables).
--
-- Pattern per table:
--   1. org_id → backfill to the single org → NOT NULL → index.
--   2. A BEFORE INSERT trigger fills a missing org_id while exactly one org
--      exists, and fails LOUD (too_many_rows) the moment there are several —
--      no caller can ever be silently assigned to the wrong tenant.
--   3. Admin policies become TO authenticated and org-scoped, with a
--      public.is_admin() bridge fallback so sessions minted before the
--      tenancy migration (no org claim yet) are not locked out. The fallback
--      is removed in the bridge-teardown migration at the end of Phase 2.
--      TO authenticated also stops anon queries from evaluating is_admin()
--      at all (it is revoked from anon, which made those reads fragile).
-- Public-facing policies (anon lead submit, booking insert, published
-- testimonial reads) are untouched.

-- ── Bridge trigger: fill org_id while there is exactly one org ───────────

create or replace function public.fill_default_org_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.org_id is null then
    -- STRICT: no_data_found when no org exists, too_many_rows when several —
    -- both must abort the write rather than guess a tenant.
    select id into strict new.org_id from public.organizations;
  end if;
  return new;
end;
$$;

revoke execute on function public.fill_default_org_id() from anon, public;

-- ── leads ────────────────────────────────────────────────────────────────

alter table public.leads add column org_id uuid references public.organizations(id);
update public.leads set org_id = (select id from public.organizations);
alter table public.leads alter column org_id set not null;
create index idx_leads_org_id on public.leads (org_id);

create trigger leads_default_org
  before insert on public.leads
  for each row execute function public.fill_default_org_id();

drop policy "Admin reads leads" on public.leads;
drop policy "Admin updates leads" on public.leads;
drop policy "Admin deletes leads" on public.leads;

create policy "Org admin reads leads" on public.leads
  for select to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

create policy "Org admin updates leads" on public.leads
  for update to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

create policy "Org admin deletes leads" on public.leads
  for delete to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── consultations ────────────────────────────────────────────────────────

alter table public.consultations add column org_id uuid references public.organizations(id);
update public.consultations set org_id = (select id from public.organizations);
alter table public.consultations alter column org_id set not null;
create index idx_consultations_org_id on public.consultations (org_id);

create trigger consultations_default_org
  before insert on public.consultations
  for each row execute function public.fill_default_org_id();

drop policy "Admin manages consultations" on public.consultations;

create policy "Org admin manages consultations" on public.consultations
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── testimonials ─────────────────────────────────────────────────────────

alter table public.testimonials add column org_id uuid references public.organizations(id);
update public.testimonials set org_id = (select id from public.organizations);
alter table public.testimonials alter column org_id set not null;
create index idx_testimonials_org_id on public.testimonials (org_id);

create trigger testimonials_default_org
  before insert on public.testimonials
  for each row execute function public.fill_default_org_id();

drop policy "Admin manages testimonials" on public.testimonials;

create policy "Org admin manages testimonials" on public.testimonials
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );
