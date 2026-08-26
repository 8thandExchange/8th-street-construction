# Rollout Phase 1 — the three decisions

Date: 2026-08-26
Status: **recommendations awaiting owner sign-off.** Nothing below is implemented;
Phase 2 (see `tenancy-design.md`) starts once these are decided.

The platform audit (`docs/product-platform-audit.md`) and the 2026-08-26 rollout
analysis established that the codebase is feature-competitive with commercial
construction software but structurally single-tenant. Before any tenancy work
begins, three decisions shape everything downstream.

## Decision 1 — the wedge market

**Recommendation: lead with publicly funded residential construction.**
Habitat affiliates, land banks, city/county home programs, and small GCs doing
municipally reimbursed work.

Why this wedge and not "Buildertrend for everyone":

- The city-budget billing mode — City # coded invoices, draw packets in the
  city's format, budget-vs-actuals workbooks, notice-to-proceed gating, and the
  AI that assembles a coded draw from a pile of sub invoices — has **no
  commercial equivalent**. Every national platform serves this market badly.
- 8th Street's own Augusta/CSRA Habitat work is the live reference deployment.
- These buyers tolerate a focused product; Buildertrend's general audience
  compares feature checklists, where we lose on timecards/e-sign/QBO today.
- The wedge sets the near-term feature priorities: draw-packet polish, funding
  program templates per jurisdiction, and grant-compliance reporting — all
  cheap extensions of what exists — over parity features.

Widening comes later, from a position of owning a niche.

## Decision 2 — the money rail

**Recommendation: Stripe Connect (embedded), keep Mercury for 8th Street's own
books until cutover.**

Mercury cannot be the product's rail: it has no platform/marketplace model, the
write token is pinned to one company's account behind one static IP, and there
is no per-tenant webhook routing. The options:

| Option | Pros | Cons |
| --- | --- | --- |
| **Stripe Connect** | Purpose-built multi-tenant; ACH debit + credit card client payments (closes a feature gap); per-tenant onboarding/KYC handled by Stripe; the platform can take a fee | Fees on payment volume; payables (vendor ACH push) needs Stripe Treasury or stays out of scope initially |
| Increase / Unit (BaaS) | Real bank accounts per tenant, ACH push for payables | Heavier compliance burden, smaller ecosystem, longer build |
| Bring-your-own-bank | No platform liability | Every tenant does manual setup; no client-pay experience; support burden scales linearly |

Sequencing under Stripe Connect: receivables first (client pays invoice online —
new capability), payables later (tenant keeps paying vendors from their own
bank, recorded in the system, as 8th Street does today minus the Mercury
automation).

## Decision 3 — the isolation model

**Recommendation: shared database, `org_id` on every row, enforced in RLS via a
JWT claim** — with **per-customer deployments as the bridge** for the first
handful of design partners.

- Shared-schema is the only model that scales operationally: one migration
  train, one deploy, usage-based pricing possible. The cost is the Phase 2
  project: org key on ~80 tables, all 183 policies rewritten, and the ~75
  service-role files moved to an org-scoped client (see `tenancy-design.md`).
- One-deployment-per-customer works today with zero code changes and gives
  perfect isolation. Use it for up to ~5 design partners to validate the wedge
  while Phase 2 is built. Hard rule: no customer-specific code forks — config
  and env only — or the deployments can never be merged back.

## Already decided by the codebase (worth restating)

- The marketing site (`/`, `/about`, `/services`, …) is 8th Street's brochure,
  not part of the product. It splits off; the product ships portals + admin.
- The Habitat/city-budget workflows stay a **funding mode** any tenant can turn
  on, not a fork (this is already the code's shape — keep it).
- Prior audit guidance ("don't generalize prematurely") is superseded by the
  owner's 2026-08-26 direction to productize; its warning still stands as the
  bar for sequencing: the single-company deployment must never degrade while
  the product is generalized.
