-- =====================================================================
-- VENDOR SELF-ONBOARDING — one link a vendor fills in themselves.
--
-- Before this, adding a payable vendor meant an admin typing in the
-- company's own details, and their ACH details could only be entered from
-- the bill detail page (so a bill had to exist first). Getting those
-- details meant asking the vendor to email their routing and account
-- numbers, which is the wrong pipe for that data.
--
-- Now: admin creates the vendor + an invite, the vendor gets a tokenised
-- link, and they type their own W-9 and ACH details straight into the
-- record. Nothing sensitive rides over email in either direction.
-- =====================================================================

-- --- W-9 / tax identity ------------------------------------------------
-- Kept separate from vendors.name: the name we call them ("American
-- Concrete") is routinely not the name on the W-9 ("American Concrete
-- Incorporated of Georgia"), and 1099s must use the latter.
alter table public.vendors
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists tax_classification text,
  add column if not exists w9_path text,
  add column if not exists onboarded_at timestamptz;

comment on column public.vendors.legal_name is
  'Name exactly as it appears on the W-9. Used for 1099 reporting; may differ from vendors.name, which is the name the office uses day to day.';
comment on column public.vendors.tax_id is
  'EIN or SSN from the W-9. SENSITIVE — stored as entered, same posture as remit_account_number. Never render this back into any page the vendor or a non-admin can reach.';
comment on column public.vendors.w9_path is
  'project-documents storage path of the uploaded W-9.';
comment on column public.vendors.onboarded_at is
  'Set the first time a vendor completes the self-onboarding form. Null means their details were entered by an admin or are still missing.';

-- --- Invites -----------------------------------------------------------
create table if not exists public.vendor_invites (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  -- SHA-256 of the token, never the token itself. A dump of this table
  -- yields no working links, which matters more here than for project
  -- shares: this link writes banking details rather than reading a Gantt.
  token_hash text not null unique,
  email text not null,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vendor_invites_vendor_idx
  on public.vendor_invites (vendor_id, created_at desc);

-- Every lookup is "the one live invite for this vendor" — a partial index
-- so superseded and completed invites don't bloat it.
create index if not exists vendor_invites_open_idx
  on public.vendor_invites (vendor_id)
  where completed_at is null and revoked_at is null;

comment on table public.vendor_invites is
  'Single-use, expiring links that let a vendor fill in their own W-9 and ACH details. Resolved by hashing the presented token and matching token_hash; see lib/vendors/onboarding.ts.';

alter table public.vendor_invites enable row level security;

-- Admins manage invites from the vendors page. The public form never uses
-- a browser client — it goes through the service role in the API route,
-- which bypasses RLS — so there is deliberately no anon policy here.
drop policy if exists "Admin manages vendor invites" on public.vendor_invites;
create policy "Admin manages vendor invites" on public.vendor_invites
  for all using (public.is_admin()) with check (public.is_admin());
