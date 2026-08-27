-- Phase 2 re-keying, table group 4 of 4 — the money core, saved for last
-- on purpose: invoices with their line items and attachments, payment
-- draws, city budget lines, and change orders with their allocations —
-- plus the last org-owned stragglers (services, portal access requests,
-- push subscriptions). After this, every org-owned table carries org_id.
-- What stays unkeyed is platform infrastructure by design: profiles
-- (identity; org membership lives in org_members), organizations itself,
-- audit_log and the webhook event stores (tenant-attributable columns come
-- with the integration fan-out), rate_limits, stripe_* (unused), and
-- site_settings until its (org_id, key) PK change.
--
-- Pattern per table, proven by groups 1-3:
--   org_id -> backfill -> NOT NULL -> index -> fill_default_org_id trigger;
--   admin policies become org-scoped TO authenticated with the is_admin()
--   bridge; client/user policies keep their checks and gain the bridged
--   org conjunct. The public published-services read is untouched.
-- ── invoices ────────────────────────────────────────────────────────────
alter table public.invoices add column org_id uuid references public.organizations(id);
update public.invoices set org_id = (select id from public.organizations);
alter table public.invoices alter column org_id set not null;
create index idx_invoices_org_id on public.invoices (org_id);

create trigger invoices_default_org
  before insert on public.invoices
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages invoices" on public.invoices;

create policy "Org admin manages invoices" on public.invoices
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own invoices" on public.invoices;

create policy "Client reads own invoices" on public.invoices
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (client_id = (select auth.uid()))
  );

drop policy "Client reads project invoices" on public.invoices;

create policy "Client reads project invoices" on public.invoices
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── invoice_line_items ──────────────────────────────────────────────────
alter table public.invoice_line_items add column org_id uuid references public.organizations(id);
update public.invoice_line_items set org_id = (select id from public.organizations);
alter table public.invoice_line_items alter column org_id set not null;
create index idx_invoice_line_items_org_id on public.invoice_line_items (org_id);

create trigger invoice_line_items_default_org
  before insert on public.invoice_line_items
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages line items" on public.invoice_line_items;

create policy "Org admin manages line items" on public.invoice_line_items
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own line items" on public.invoice_line_items;

create policy "Client reads own line items" on public.invoice_line_items
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.invoices i
      where i.id = invoice_line_items.invoice_id
        and public.client_has_project_portal_access(i.project_id)
    ))
  );

-- ── invoice_attachments ─────────────────────────────────────────────────
alter table public.invoice_attachments add column org_id uuid references public.organizations(id);
update public.invoice_attachments set org_id = (select id from public.organizations);
alter table public.invoice_attachments alter column org_id set not null;
create index idx_invoice_attachments_org_id on public.invoice_attachments (org_id);

create trigger invoice_attachments_default_org
  before insert on public.invoice_attachments
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages invoice attachments" on public.invoice_attachments;

create policy "Org admin manages invoice attachments" on public.invoice_attachments
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own invoice attachments" on public.invoice_attachments;

create policy "Client reads own invoice attachments" on public.invoice_attachments
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.invoices i
      where i.id = invoice_attachments.invoice_id
        and (
          i.client_id = (select auth.uid())
          or exists (
            select 1 from public.projects p
            where p.id = i.project_id and p.client_id = (select auth.uid())
          )
        )
    ))
  );

-- ── payment_draws ───────────────────────────────────────────────────────
alter table public.payment_draws add column org_id uuid references public.organizations(id);
update public.payment_draws set org_id = (select id from public.organizations);
alter table public.payment_draws alter column org_id set not null;
create index idx_payment_draws_org_id on public.payment_draws (org_id);

create trigger payment_draws_default_org
  before insert on public.payment_draws
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages draws" on public.payment_draws;

create policy "Org admin manages draws" on public.payment_draws
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own draws" on public.payment_draws;

create policy "Client reads own draws" on public.payment_draws
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── city_budget_lines ───────────────────────────────────────────────────
alter table public.city_budget_lines add column org_id uuid references public.organizations(id);
update public.city_budget_lines set org_id = (select id from public.organizations);
alter table public.city_budget_lines alter column org_id set not null;
create index idx_city_budget_lines_org_id on public.city_budget_lines (org_id);

create trigger city_budget_lines_default_org
  before insert on public.city_budget_lines
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages city budget lines" on public.city_budget_lines;

create policy "Org admin manages city budget lines" on public.city_budget_lines
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own project city budget" on public.city_budget_lines;

create policy "Client reads own project city budget" on public.city_budget_lines
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (exists (
      select 1 from public.projects p
      where p.id = city_budget_lines.project_id
        and p.client_id = (select auth.uid())
    ))
  );

-- ── change_orders ───────────────────────────────────────────────────────
alter table public.change_orders add column org_id uuid references public.organizations(id);
update public.change_orders set org_id = (select id from public.organizations);
alter table public.change_orders alter column org_id set not null;
create index idx_change_orders_org_id on public.change_orders (org_id);

create trigger change_orders_default_org
  before insert on public.change_orders
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages change orders" on public.change_orders;

create policy "Org admin manages change orders" on public.change_orders
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Client reads own change orders" on public.change_orders;

create policy "Client reads own change orders" on public.change_orders
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (public.client_has_project_portal_access(project_id))
  );

-- ── change_order_allocations ────────────────────────────────────────────
alter table public.change_order_allocations add column org_id uuid references public.organizations(id);
update public.change_order_allocations set org_id = (select id from public.organizations);
alter table public.change_order_allocations alter column org_id set not null;
create index idx_change_order_allocations_org_id on public.change_order_allocations (org_id);

create trigger change_order_allocations_default_org
  before insert on public.change_order_allocations
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages change order allocations" on public.change_order_allocations;

create policy "Org admin manages change order allocations" on public.change_order_allocations
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── services ────────────────────────────────────────────────────────────
alter table public.services add column org_id uuid references public.organizations(id);
update public.services set org_id = (select id from public.organizations);
alter table public.services alter column org_id set not null;
create index idx_services_org_id on public.services (org_id);

create trigger services_default_org
  before insert on public.services
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages services" on public.services;

create policy "Org admin manages services" on public.services
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── portal_access_requests ──────────────────────────────────────────────
alter table public.portal_access_requests add column org_id uuid references public.organizations(id);
update public.portal_access_requests set org_id = (select id from public.organizations);
alter table public.portal_access_requests alter column org_id set not null;
create index idx_portal_access_requests_org_id on public.portal_access_requests (org_id);

create trigger portal_access_requests_default_org
  before insert on public.portal_access_requests
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages access requests" on public.portal_access_requests;

create policy "Org admin manages access requests" on public.portal_access_requests
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── push_subscriptions ──────────────────────────────────────────────────
alter table public.push_subscriptions add column org_id uuid references public.organizations(id);
update public.push_subscriptions set org_id = (select id from public.organizations);
alter table public.push_subscriptions alter column org_id set not null;
create index idx_push_subscriptions_org_id on public.push_subscriptions (org_id);

create trigger push_subscriptions_default_org
  before insert on public.push_subscriptions
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages push subscriptions" on public.push_subscriptions;

create policy "Org admin manages push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Users manage own push subscriptions" on public.push_subscriptions;

create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (profile_id = (select auth.uid()))
  )
  with check (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (profile_id = (select auth.uid()))
  );


