# Multi-tenancy engineering design

Date: 2026-08-26
Status: **design for Phase 2 of the rollout plan.** Not started. Depends on the
Phase 1 decisions (`phase-1-decisions.md`). Estimated 3–5 focused months.

## Current state (from the 2026-08-26 audit)

- No `org_id` / `company_id` / `tenant_id` on any of the ~85 public tables.
- All 183 RLS policies scope by role (`is_admin()`, used ~175 times) or by
  project membership — never by organization. "Admin" means "8th Street staff."
- ~214 call sites in ~75 files use `createAdminClient()` (service role), which
  bypasses RLS entirely.
- 4 shared storage buckets with `is_admin()` policies and no tenant-prefixed
  paths.
- Company identity hardcoded in ~102 files; one customer's data (608 Macon /
  Habitat constants, `KNOWN_CLIENT_ORGS`, slug fallbacks) baked into product
  code; migrations carry production seed rows (board minutes with real names).
- Single-account integrations: one Supabase project, one Mercury account +
  Fixie IP, one Resend domain, one Vercel project with 4 company-wide crons,
  one Anthropic key with no per-tenant metering, one `FIELD_ENCRYPTION_KEY`.
- `profiles.id = auth.users.id` with a single `role` + `staff_scope`: a person
  can belong to exactly one company, in one role, forever.

## Target architecture

### 1. Organizations and membership

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  legal_name text not null,          -- contract party, PDF headers
  display_name text not null,
  address jsonb,
  phone text,
  reply_to_email text,
  sending_domain text,               -- Resend domain, once verified
  jurisdiction_default text,         -- building-regulations registry key
  logo_path text,
  theme jsonb,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role user_role not null,           -- admin | client | subcontractor
  staff_scope text,                  -- for role = admin
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
```

`profiles` keeps person-level facts (name, email, must_change_password);
`role` and `staff_scope` **move to `org_members`** so a sub can work for three
builders and a client can have two GCs. This cascades into `is_admin()`,
`user_role()`, `requireAdmin()`, and every staff-scope call site — budget it as
its own workstream.

### 2. The org claim

The active org travels in the JWT (`app_metadata.org_id`), set at login /
org-switch via an edge function using the admin API. Policies read it through
one helper so it initplans:

```sql
create function public.current_org_id() returns uuid
language sql stable as $$
  select nullif(((select auth.jwt()) -> 'app_metadata' ->> 'org_id'), '')::uuid
$$;

create function public.is_org_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from org_members m
    where m.org_id = public.current_org_id()
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  )
$$;
```

### 3. Schema re-keying

- Add `org_id uuid not null references organizations(id)` to every
  org-owned table (~80). Backfill with 8th Street's org id in the same
  migration; add the FK index.
- Tables that are already project-scoped inherit their org via the project —
  they STILL get a direct `org_id` column (denormalized) so policies never
  need a join to check tenancy, and so the column can carry a composite
  index `(org_id, ...)` for every hot query.
- `site_settings` PK changes from `key` to `(org_id, key)`.
- Global/platform tables (rate_limits, webhook event stores) stay unkeyed but
  get a scoping prefix or column where events are tenant-attributable.
- Postgres 15+: consider `security_invoker` views per org for reporting later;
  not required for v1.

### 4. RLS rewrite

Every policy gains the tenancy conjunct. The shape for admin-managed tables:

```sql
using (org_id = public.current_org_id() and public.is_org_admin())
```

Client/sub policies add `org_id = public.current_org_id()` to their existing
project-membership checks. This is a mechanical rewrite of all 183 policies —
generate it from `pg_policies`, review by hand, and land it with the
**RLS test suite** below. Also consolidate the 289 flagged
multiple-permissive-policy overlaps in the same pass (one policy per
role×action where possible).

### 5. Service-role strategy — the critical one

`createAdminClient()` bypasses RLS, so under multi-tenancy every one of the
~214 call sites is a cross-tenant leak waiting for a missed `.eq("org_id", …)`.
Application-level filters are not an acceptable backstop.

Replace it with a **request-scoped org client**: a Postgres role that is NOT
`service_role` but has broad table grants, combined with
`set_config('request.org_id', $1, true)` at connection checkout, and policies
that honor `current_setting('request.org_id')` when set. Server code gets:

```ts
const db = await createOrgClient(); // resolves org from the caller's session
```

`createAdminClient()` survives only for genuinely tenant-less work (webhook
ingestion before attribution, platform ops) behind a lint rule
(`no-restricted-imports`) that fails CI anywhere else.

### 6. Storage

- New object paths: `org/<org_id>/…` for all four buckets.
- Policies check the path prefix against `current_org_id()`.
- One-time migration moves existing objects under 8th Street's org prefix and
  rewrites `storage_path` columns.

### 7. Identity-as-data

- `src/lib/brand/assets.ts` `BRAND`, `site-contact.ts` defaults, PDF headers,
  print pages, email footers, `standard-terms.ts` contractor preamble, legal
  pages → all read from the `organizations` row (+ a `contract_boilerplate`
  per-org template with `{{contractor_*}}` merge fields joining the existing
  `{{owner_*}}` ones).
- Delete every `slug === "608-macon-ave"` fallback. `HABITAT_608_MACON_CITY_BUDGET`
  and the draw templates become org-owned **budget/draw templates** seeded for
  8th Street's org only. `KNOWN_CLIENT_ORGS` becomes a table.
- `resolveJurisdiction()` loses its silent Augusta default — unknown
  jurisdiction is an explicit "not configured" state.
- Strip seed data out of migration history (board minutes, Habitat profile
  updates, hero copy): move to `scripts/seed-8th-street.ts`, run once per org
  at onboarding. Migrations must be content-free of customer data before any
  second tenant exists.

### 8. Integrations per tenant

| Integration | Plan |
| --- | --- |
| Payments | Stripe Connect per Phase 1 decision; `stripe_accounts(org_id, acct_id, …)`; webhook route resolves org from the connected account id |
| Email | One platform sending domain for v1 (`onbehalf@product`), with per-org `reply_to`; per-org verified domains as a later upgrade. All 14 `new Resend()` sites collapse into one `sendEmail(org, …)` helper (which is also where an outbox/retry gets added) |
| Crons | Each cron fans out per org via a queue table (`cron_runs(org_id, job, ...)`) so one tenant's failure can't starve the rest |
| AI | Per-org token metering table written by the assistant stream (input/output tokens per request); plan limits enforced there |
| Encryption | Per-org derived keys: `HKDF(master, org_id)` so a leaked derivation for one tenant never exposes another; re-encryption script keyed per org |
| Supabase | Stays one project (shared schema). Staging project added in Phase 0 ops work |

### 9. The SaaS layer (Phase 3, depends on this design)

Signup → creates `organizations` + owner membership → Stripe subscription →
onboarding (templates, jurisdiction, logo) → seat invites. Plan limits read
from the subscription record. None of this exists today.

## Sequencing inside Phase 2

1. RLS test harness first (pgTAP or SQL-run-as-role fixtures in CI) — the
   rewrite is only safe if cross-tenant reads fail tests before and after.
2. `organizations` + `org_members` + claim plumbing, 8th Street backfilled.
3. Service-role replacement pattern + lint rule (before re-keying, so new code
   can't add leaks while the migration lands).
4. Schema re-keying + policy rewrite, table-group by table-group (money tables
   last, behind the test harness).
5. Storage migration.
6. Identity-as-data + seed-scrub.
7. Integration fan-out.

## Explicitly out of scope for Phase 2

Timecards, e-sign, QBO sync, report builder (Phase 4); marketing-site
templating and per-tenant custom domains (post-v1); data-retention/GDPR
tooling (with the commercial layer).
