-- =====================================================================
-- PROPOSALS AND THE SCOPE LIBRARY.
--
-- The estimate produced an internal budget grid but nothing customer-
-- facing: no proposal document, no accept/decline record. And "how we
-- build" lived in free-text — a scope typed once per bid request, so a
-- technique standard (advanced framing, air sealing, heat pumps) had no
-- home. Scope templates are that home: reusable per-trade scopes that
-- prefill bid requests, so the standard is what subs actually bid.
-- =====================================================================

create table project_proposals (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null,                    -- Proposal #1, #2 per project
  title text not null,
  scope_md text not null,                 -- what we will build, in full
  terms_md text,                          -- payment schedule, exclusions
  amount numeric(12,2) not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'withdrawn')),
  sent_at timestamptz,
  responded_at timestamptz,
  response_note text,                     -- how the acceptance arrived
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create index project_proposals_project_idx on project_proposals(project_id);

comment on table project_proposals is
  'Customer-facing proposals built from the estimate. Status is the
   record: sent, then accepted/declined with when and how.';

alter table project_proposals enable row level security;

create policy "Admin manages proposals" on project_proposals
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists project_proposals_updated_at on project_proposals;
create trigger project_proposals_updated_at
  before update on project_proposals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------

create table scope_templates (
  id uuid primary key default uuid_generate_v4(),
  trade text not null,                    -- "Framing", "HVAC"
  title text not null,                    -- "Advanced framing (OVE)"
  body_md text not null,                  -- the scope, in full sentences
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scope_templates_trade_idx on scope_templates(trade);

comment on table scope_templates is
  'Reusable trade scopes — the standards library. Prefilled into bid
   requests so a technique standard is what subs actually price.';

alter table scope_templates enable row level security;

create policy "Admin manages scope templates" on scope_templates
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists scope_templates_updated_at on scope_templates;
create trigger scope_templates_updated_at
  before update on scope_templates
  for each row execute function public.set_updated_at();
