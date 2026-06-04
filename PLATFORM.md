# 8th Street Platform — Buildertrend-Class Roadmap

Phase 1 (marketing + CRM shell) is **live**. This document is the honest plan for **operations backend**: projects, tasks, subs, client portal, and Stripe money flow.

**No software ships with zero flaws.** The goal is phased delivery, automated tests on money paths, RLS on every table, and Stripe webhooks with idempotency — the same discipline institutional builders expect.

---

## What you already have (database + partial UI)

| Capability | Schema | Admin UI | Client portal | Sub portal |
|------------|--------|----------|---------------|------------|
| Projects / portfolio | ✅ | ✅ CMS | ✅ read-only | — |
| Milestones | ✅ | ❌ | ✅ read-only | — |
| Progress updates + photos | ✅ | ❌ | ✅ read-only | — |
| Documents | ✅ | ❌ | ✅ read-only | — |
| Messages | ✅ | ❌ | — | — |
| Change orders | ✅ | ❌ | — | — |
| Subcontractors + bids | ✅ | ❌ | ✅ list only | — |
| Leads + consultations | ✅ | ✅ | — | — |
| **Tasks** | 🔜 migration | ❌ | ❌ | — |
| **Invoices + draws** | 🔜 migration | ❌ | ❌ | — |
| **Stripe payments** | 🔜 migration | ❌ | ❌ | — |
| Punch list, scheduling, warranty | ❌ future | ❌ | ❌ | — |

---

## Recommended build order (fastest path to “running the business”)

### Phase 2A — Project command center (2–3 weeks)
**You can run active jobs without email chaos.**

1. Project hub at `/admin/projects/[id]` with tabs: Overview · Milestones · Updates · Documents · Messages · Change orders
2. Milestone CRUD + drag reorder (`@dnd-kit`)
3. Progress updates with multi-image upload to Supabase Storage
4. Document upload + visibility (client vs internal)
5. In-portal messaging (Supabase Realtime optional v1)
6. Change orders: admin create → client approve/reject → budget rollup

**Exit criteria:** One real project fully managed in admin; client sees live timeline on phone.

### Phase 2B — Task management (1–2 weeks)
1. `project_tasks` — assignee, due date, priority, link to milestone optional
2. Admin: Kanban or grouped list per project
3. Optional: client sees “your action items” (limited)

### Phase 3 — Subcontractor bidding (2 weeks)
Per [PHASES.md](./PHASES.md): RFQs, bid comparison, award flow, `/admin/subcontractors`.

### Phase 4 — Stripe invoicing & draws (2–3 weeks) ⚠️ highest risk
Money requires extra care:

1. **Stripe Connect** or **Stripe Invoicing** (decision: invoice clients vs ACH draw schedule)
2. Tables: `invoices`, `invoice_line_items`, `payment_draws`, `stripe_customers`, `payment_events`
3. API routes: `POST /api/stripe/webhook` (signature verify, idempotent)
4. Admin: create invoice / draw → send → track paid
5. Client portal: pay invoice (Stripe Checkout or Payment Element)
6. Email receipts via Resend

**Exit criteria:** Test mode payment end-to-end; webhook replay safe; admin sees ledger per project.

### Phase 5 — Intelligence layer (ongoing)
- Lead → won project conversion wizard
- Budget vs actual (contract + COs + draws)
- Audit log surfaced in admin
- Reporting dashboard
- Mobile PWA polish

---

## Architecture decisions (pick before Phase 4)

| Question | Option A | Option B |
|----------|----------|----------|
| Stripe model | **Invoicing API** — simple line-item invoices | **Checkout + Payment Intents** — more flexible |
| Draw schedule | Milestone-linked `%` draws | Manual draw amounts |
| Client pay | Hosted invoice page | Embedded portal pay |
| Sub payouts | Later (Connect) | Not in v1 |

**Recommendation:** Stripe **Invoices** + **Checkout** for client pay in v1; milestone-linked **draws** as internal schedule that generates invoices.

---

## Quality bar (how we avoid “flaws” on money & data)

1. **RLS** on every new table — clients only see their project
2. **Server actions** + service role only in API routes that need it
3. **Webhook idempotency** — `stripe_events` table with unique `event_id`
4. **Tests** — Vitest for invoice math, CO budget rollup, webhook handler
5. **Staging** — Supabase branch + Vercel preview + Stripe test mode before production keys
6. **No secrets in git** — Stripe keys in Vercel only

---

## Apply the billing schema migration

```bash
# After linking Supabase project:
supabase db push
# Or paste supabase/migrations/20260604000000_platform_billing_tasks.sql in SQL Editor
```

---

## What to build next in Cursor

Copy this prompt when ready for Phase 2A:

> Implement Phase 2A from PLATFORM.md. Start with `/admin/projects/[id]` project hub layout and full milestone CRUD at `/admin/projects/[id]/milestones` with @dnd-kit reorder. Use existing RLS. Match admin design. Server actions + revalidatePath. Then stub tabs for Updates, Documents, Messages, Change orders with “coming next” only if not implemented in this pass.

---

## Rough timeline (one focused builder + AI assist)

| Phase | Calendar |
|-------|----------|
| 2A PM core | 2–3 weeks |
| 2B Tasks | 1–2 weeks |
| 3 Subs | 2 weeks |
| 4 Stripe | 2–3 weeks + QA |
| **Total to “Buildertrend MVP”** | **~8–10 weeks** |

“On steroids” (punch list, scheduling, selections, warranty, analytics) adds **+8–12 weeks**.

---

## Your call

Reply with which slice to start:

1. **Phase 2A** — milestones + project hub (best first step)
2. **Phase 4** — Stripe invoicing (only if billing is the urgent pain)
3. **Full parallel spec** — I’ll break into GitHub issues / milestones

We build in order. We test money paths twice. We don’t promise zero bugs — we promise production-grade process.
