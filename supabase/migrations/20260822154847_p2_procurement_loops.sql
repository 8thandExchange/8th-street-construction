-- =====================================================================
-- P2 PRE-CONSTRUCTION AND PROCUREMENT LOOPS.
--
-- Close the gaps between accepted proposals and agreements, awarded bids
-- and purchase orders, and bid leveling that disappeared on refresh.
-- =====================================================================

alter table project_contracts
  add column if not exists source_proposal_id uuid references project_proposals(id) on delete set null,
  add column if not exists client_signature_text text,
  add column if not exists client_signed_at timestamptz,
  add column if not exists client_signed_by uuid references profiles(id) on delete set null;

create unique index if not exists project_contracts_source_proposal_uidx
  on project_contracts(source_proposal_id)
  where source_proposal_id is not null;

comment on column project_contracts.source_proposal_id is
  'Accepted proposal this agreement was drafted from. One contract per proposal.';

drop policy if exists "Clients read agreements sent for signature" on project_contracts;
create policy "Clients read agreements sent for signature"
  on project_contracts
  for select
  using (
    status in ('out_for_signature', 'signed')
    and public.client_has_project_portal_access(project_id)
  );

-- ---------------------------------------------------------------------

alter table bid_requests
  add column if not exists scope_template_id uuid references scope_templates(id) on delete set null;

alter table bids
  add column if not exists alternates text,
  add column if not exists exclusions text,
  add column if not exists qualifications text;

create table if not exists bid_request_reviews (
  id uuid primary key default gen_random_uuid(),
  bid_request_id uuid not null references bid_requests(id) on delete cascade,
  recommended_bid_id uuid references bids(id) on delete set null,
  summary text not null default '',
  recommendation text not null default '',
  analysis_json jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bid_request_reviews_rfq_idx
  on bid_request_reviews(bid_request_id, created_at desc);

comment on table bid_request_reviews is
  'Persisted bid-leveling notes and recommendations. Newest row is the current review.';

alter table bid_request_reviews enable row level security;

drop policy if exists "Admin manages bid request reviews" on bid_request_reviews;
create policy "Admin manages bid request reviews"
  on bid_request_reviews
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------

alter table purchase_orders
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_note text;

alter table vendor_bills
  add column if not exists purchase_order_id uuid references purchase_orders(id) on delete set null;

create index if not exists vendor_bills_po_idx
  on vendor_bills(purchase_order_id)
  where purchase_order_id is not null;

-- ---------------------------------------------------------------------

alter table scope_templates
  add column if not exists last_variance_note text,
  add column if not exists last_variance_at timestamptz;
