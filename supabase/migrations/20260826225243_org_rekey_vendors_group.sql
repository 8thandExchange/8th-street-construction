-- Phase 2 re-keying, table group 3 of N: vendors, subcontractors, and the
-- payables/procurement chain (vendor bills + allocations, compliance,
-- invites, purchase orders + lines, Mercury customer links), plus the
-- org-owned template/catalog tables (contract, scope, and cost-code
-- templates with their lines and takeoff, house base plans, company
-- compliance and its reminder log). What remains after this group is the
-- client-invoicing money core (invoices, line items, attachments, payment
-- draws, city budget lines, change orders + allocations) — deliberately
-- last — and the platform stores that stay unkeyed (rate_limits, webhook
-- event tables, audit_log, site_settings until its PK change).
--
-- Pattern per table, proven by groups 1-2:
--   org_id -> backfill -> NOT NULL -> index -> fill_default_org_id trigger;
--   admin policies become org-scoped TO authenticated with the is_admin()
--   bridge; user-scoped policies (sub self-access, authenticated catalog
--   reads) keep their check and gain the bridged org conjunct.
-- ── vendors ─────────────────────────────────────────────────────────────
alter table public.vendors add column org_id uuid references public.organizations(id);
update public.vendors set org_id = (select id from public.organizations);
alter table public.vendors alter column org_id set not null;
create index idx_vendors_org_id on public.vendors (org_id);

create trigger vendors_default_org
  before insert on public.vendors
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages vendors" on public.vendors;

create policy "Org admin manages vendors" on public.vendors
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── vendor_compliance_items ─────────────────────────────────────────────
alter table public.vendor_compliance_items add column org_id uuid references public.organizations(id);
update public.vendor_compliance_items set org_id = (select id from public.organizations);
alter table public.vendor_compliance_items alter column org_id set not null;
create index idx_vendor_compliance_items_org_id on public.vendor_compliance_items (org_id);

create trigger vendor_compliance_items_default_org
  before insert on public.vendor_compliance_items
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages vendor compliance" on public.vendor_compliance_items;

create policy "Org admin manages vendor compliance" on public.vendor_compliance_items
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── vendor_invites ──────────────────────────────────────────────────────
alter table public.vendor_invites add column org_id uuid references public.organizations(id);
update public.vendor_invites set org_id = (select id from public.organizations);
alter table public.vendor_invites alter column org_id set not null;
create index idx_vendor_invites_org_id on public.vendor_invites (org_id);

create trigger vendor_invites_default_org
  before insert on public.vendor_invites
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages vendor invites" on public.vendor_invites;

create policy "Org admin manages vendor invites" on public.vendor_invites
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── subcontractors ──────────────────────────────────────────────────────
alter table public.subcontractors add column org_id uuid references public.organizations(id);
update public.subcontractors set org_id = (select id from public.organizations);
alter table public.subcontractors alter column org_id set not null;
create index idx_subcontractors_org_id on public.subcontractors (org_id);

create trigger subcontractors_default_org
  before insert on public.subcontractors
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages subs" on public.subcontractors;

create policy "Org admin manages subs" on public.subcontractors
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Sub reads own record" on public.subcontractors;

create policy "Sub reads own record" on public.subcontractors
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (profile_id = (select auth.uid()))
  );

drop policy "Sub updates own record" on public.subcontractors;

create policy "Sub updates own record" on public.subcontractors
  for update to authenticated
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

-- ── vendor_bills ────────────────────────────────────────────────────────
alter table public.vendor_bills add column org_id uuid references public.organizations(id);
update public.vendor_bills set org_id = (select id from public.organizations);
alter table public.vendor_bills alter column org_id set not null;
create index idx_vendor_bills_org_id on public.vendor_bills (org_id);

create trigger vendor_bills_default_org
  before insert on public.vendor_bills
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages vendor bills" on public.vendor_bills;

create policy "Org admin manages vendor bills" on public.vendor_bills
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── vendor_bill_allocations ─────────────────────────────────────────────
alter table public.vendor_bill_allocations add column org_id uuid references public.organizations(id);
update public.vendor_bill_allocations set org_id = (select id from public.organizations);
alter table public.vendor_bill_allocations alter column org_id set not null;
create index idx_vendor_bill_allocations_org_id on public.vendor_bill_allocations (org_id);

create trigger vendor_bill_allocations_default_org
  before insert on public.vendor_bill_allocations
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages vendor bill allocations" on public.vendor_bill_allocations;

create policy "Org admin manages vendor bill allocations" on public.vendor_bill_allocations
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── purchase_orders ─────────────────────────────────────────────────────
alter table public.purchase_orders add column org_id uuid references public.organizations(id);
update public.purchase_orders set org_id = (select id from public.organizations);
alter table public.purchase_orders alter column org_id set not null;
create index idx_purchase_orders_org_id on public.purchase_orders (org_id);

create trigger purchase_orders_default_org
  before insert on public.purchase_orders
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages purchase orders" on public.purchase_orders;

create policy "Org admin manages purchase orders" on public.purchase_orders
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── purchase_order_lines ────────────────────────────────────────────────
alter table public.purchase_order_lines add column org_id uuid references public.organizations(id);
update public.purchase_order_lines set org_id = (select id from public.organizations);
alter table public.purchase_order_lines alter column org_id set not null;
create index idx_purchase_order_lines_org_id on public.purchase_order_lines (org_id);

create trigger purchase_order_lines_default_org
  before insert on public.purchase_order_lines
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages purchase order lines" on public.purchase_order_lines;

create policy "Org admin manages purchase order lines" on public.purchase_order_lines
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── company_compliance_items ────────────────────────────────────────────
alter table public.company_compliance_items add column org_id uuid references public.organizations(id);
update public.company_compliance_items set org_id = (select id from public.organizations);
alter table public.company_compliance_items alter column org_id set not null;
create index idx_company_compliance_items_org_id on public.company_compliance_items (org_id);

create trigger company_compliance_items_default_org
  before insert on public.company_compliance_items
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages compliance items" on public.company_compliance_items;

create policy "Org admin manages compliance items" on public.company_compliance_items
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── compliance_reminder_log ─────────────────────────────────────────────
alter table public.compliance_reminder_log add column org_id uuid references public.organizations(id);
update public.compliance_reminder_log set org_id = (select id from public.organizations);
alter table public.compliance_reminder_log alter column org_id set not null;
create index idx_compliance_reminder_log_org_id on public.compliance_reminder_log (org_id);

create trigger compliance_reminder_log_default_org
  before insert on public.compliance_reminder_log
  for each row execute function public.fill_default_org_id();
drop policy "Admin reads reminder log" on public.compliance_reminder_log;

create policy "Org admin reads reminder log" on public.compliance_reminder_log
  for select to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── mercury_customers ───────────────────────────────────────────────────
alter table public.mercury_customers add column org_id uuid references public.organizations(id);
update public.mercury_customers set org_id = (select id from public.organizations);
alter table public.mercury_customers alter column org_id set not null;
create index idx_mercury_customers_org_id on public.mercury_customers (org_id);

create trigger mercury_customers_default_org
  before insert on public.mercury_customers
  for each row execute function public.fill_default_org_id();
drop policy "mercury_customers_admin_all" on public.mercury_customers;

create policy "Org admin manages mercury customers" on public.mercury_customers
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── contract_templates ──────────────────────────────────────────────────
alter table public.contract_templates add column org_id uuid references public.organizations(id);
update public.contract_templates set org_id = (select id from public.organizations);
alter table public.contract_templates alter column org_id set not null;
create index idx_contract_templates_org_id on public.contract_templates (org_id);

create trigger contract_templates_default_org
  before insert on public.contract_templates
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages contract templates" on public.contract_templates;

create policy "Org admin manages contract templates" on public.contract_templates
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── scope_templates ─────────────────────────────────────────────────────
alter table public.scope_templates add column org_id uuid references public.organizations(id);
update public.scope_templates set org_id = (select id from public.organizations);
alter table public.scope_templates alter column org_id set not null;
create index idx_scope_templates_org_id on public.scope_templates (org_id);

create trigger scope_templates_default_org
  before insert on public.scope_templates
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages scope templates" on public.scope_templates;

create policy "Org admin manages scope templates" on public.scope_templates
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── cost_code_templates ─────────────────────────────────────────────────
alter table public.cost_code_templates add column org_id uuid references public.organizations(id);
update public.cost_code_templates set org_id = (select id from public.organizations);
alter table public.cost_code_templates alter column org_id set not null;
create index idx_cost_code_templates_org_id on public.cost_code_templates (org_id);

create trigger cost_code_templates_default_org
  before insert on public.cost_code_templates
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages cost code templates" on public.cost_code_templates;

create policy "Org admin manages cost code templates" on public.cost_code_templates
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── cost_code_template_lines ────────────────────────────────────────────
alter table public.cost_code_template_lines add column org_id uuid references public.organizations(id);
update public.cost_code_template_lines set org_id = (select id from public.organizations);
alter table public.cost_code_template_lines alter column org_id set not null;
create index idx_cost_code_template_lines_org_id on public.cost_code_template_lines (org_id);

create trigger cost_code_template_lines_default_org
  before insert on public.cost_code_template_lines
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages cost code template lines" on public.cost_code_template_lines;

create policy "Org admin manages cost code template lines" on public.cost_code_template_lines
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── cost_code_template_takeoff ──────────────────────────────────────────
alter table public.cost_code_template_takeoff add column org_id uuid references public.organizations(id);
update public.cost_code_template_takeoff set org_id = (select id from public.organizations);
alter table public.cost_code_template_takeoff alter column org_id set not null;
create index idx_cost_code_template_takeoff_org_id on public.cost_code_template_takeoff (org_id);

create trigger cost_code_template_takeoff_default_org
  before insert on public.cost_code_template_takeoff
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages template takeoff" on public.cost_code_template_takeoff;

create policy "Org admin manages template takeoff" on public.cost_code_template_takeoff
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

-- ── house_base_plans ────────────────────────────────────────────────────
alter table public.house_base_plans add column org_id uuid references public.organizations(id);
update public.house_base_plans set org_id = (select id from public.organizations);
alter table public.house_base_plans alter column org_id set not null;
create index idx_house_base_plans_org_id on public.house_base_plans (org_id);

create trigger house_base_plans_default_org
  before insert on public.house_base_plans
  for each row execute function public.fill_default_org_id();
drop policy "Admin manages base plans" on public.house_base_plans;

create policy "Org admin manages base plans" on public.house_base_plans
  for all to authenticated
  using (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  )
  with check (
    (org_id = (select public.current_org_id()) and (select public.is_org_admin()))
    or public.is_admin()
  );

drop policy "Authenticated reads active base plans" on public.house_base_plans;

create policy "Authenticated reads active base plans" on public.house_base_plans
  for select to authenticated
  using (
    (org_id = (select public.current_org_id())
     or (select public.current_org_id()) is null)
    and (active = true
      and (select auth.uid()) is not null)
  );


