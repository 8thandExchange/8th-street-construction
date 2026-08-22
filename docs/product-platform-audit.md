# Product platform audit and roadmap

Date: 2026-08-22  
Product: 8th Street Construction operations platform  
Scope: public site, admin operations, client and subcontractor portals, financial workflows, AI assistants, Supabase, and production readiness

## Executive assessment

This is already a serious single-company construction operating system. It is not an early
marketing site with a few portal screens. The code supports lead intake, project playbooks,
estimating, schedules, field records, subcontractor quotes, purchase orders, client billing,
vendor payables, job costing, contracts, meetings, compliance, client decisions, and two
role-specific AI assistants.

The primary product problem is not missing breadth. It is that the breadth is fragmented:

- company leadership cannot see cash, commitments, schedule exceptions, and job health in one brief;
- dense navigation exposes the underlying module list instead of the next decision;
- the assistant is global while construction work is job-centric;
- several client and subcontractor workflows stop one step before a complete digital loop;
- operational screens use multiple visual dialects, especially between admin and portals;
- live workflow adoption is concentrated in tasks, milestones, estimates, invoices, vendor bills,
  and meeting commitments while field communication and trade collaboration remain lightly used.

The product should be optimized as an Augusta/CSRA builder's operating system, not generalized
prematurely into multi-tenant SaaS. Habitat, city-budget, volunteer, and local compliance workflows
are differentiators when they appear contextually rather than dominating generic job management.

## Product principles

1. **Decisions before modules.** Home screens answer what needs attention, what changed, and what
   decision is next.
2. **Every workflow has one record.** A proposal, invoice, plan approval, field log, or commitment
   has an owner, status, timestamp, supporting evidence, and next action.
3. **Job context is persistent.** Schedule, cost, documents, client communication, and AI actions
   should retain the current project automatically.
4. **Draft first; approve consequences.** AI may prepare reversible work. Money movement,
   client-visible commitments, access changes, and outbound communication require human review.
5. **Financial language stays precise.** Estimate, committed, actual, invoiced, collected, and
   payable are separate values. The UI never collapses them into an ambiguous “budget.”
6. **One calm operational design system.** Marketing can remain editorial; admin and portals use
   the same quiet, data-first typography, spacing, controls, and semantic status language.
7. **Field use is mobile use.** Navigation, capture, approvals, and evidence must work at phone
   width without horizontal discovery.

## Current capability map

### Strong and operational

- CRM: leads, consultations, conversion into projects
- Project setup: base plans, funding/client assignment, Georgia/South Carolina build playbooks
- Build control: milestones, task checklists, dependencies, Gantt schedule, inspections
- Cost control: templates, takeoff values, estimates, sub quotes, purchase orders, job-cost rollups
- Revenue: proposals, contracts, draw schedules, invoices, Mercury ACH flow, backup packets
- Payables: vendors, bills, encrypted remittance data, Mercury payment intent
- Client experience: updates, plans, selections, documents, billing, messages, change orders
- Governance: meetings, locked minutes, decisions, action-item nudges, compliance reminders
- AI: admin tool-calling assistant and RLS-scoped client concierge

### Partial

- Subcontractor portal: bid response is minimal and the admin UI still encourages manual entry
- Proposals: admin create/send is strong; client response is added in this release
- Daily logs: text persists, but AI input photos are not retained with the log
- Punch list: admin-managed and client-readable, but clients cannot add evidence or comments
- Messaging: real-time text exists; attachments and visible read state do not
- Accounting: accurate exports exist; QuickBooks synchronization is manual
- E-sign: contract generation exists; signing is handled outside the product
- Permissions: admin/client/subcontractor roles exist; project-manager and accounting scopes do not

### Missing or intentionally deferred

- RFIs and submittals
- warranty/service requests after closeout
- timecards, crew allocation, and offline field capture
- live accounting synchronization
- integrated e-signature provider
- portfolio forecasting and capacity planning

## Live usage baseline

The production database confirms meaningful use of:

- 5 projects
- 145 project tasks
- 22 milestones
- 71 estimate lines
- 33 city-budget lines
- 3 invoices with 9 line items and 8 backup attachments
- 5 vendor bills
- 10 meeting action items

At audit time, purchase orders, project messages, daily logs, selections, punch items, bid requests,
and change orders had little or no production data. This does not prove the features are poor, but it
does mean the next release should improve workflow completion and adoption before adding more modules.

## Experience and design findings

### Public site

The marketing system is cohesive: self-hosted typography, restrained motion, clear brand color,
responsive imagery, and an editorial hierarchy. It should not be flattened into the operational
application style.

### Admin

The Inter-based application layer is the right direction and already resembles the calm density of
high-quality financial software. The previous company home, however, prioritized counts and large
job cards over cash and decisions. Navigation remains long because all modules are first-class.

### Client and subcontractor portals

Shared dashboard components referenced application tokens that were scoped only to the admin shell.
Mobile portal navigation disappeared entirely below the desktop breakpoint. Project navigation
required horizontally discovering up to twelve client tabs or twenty admin sections.

### Accessibility

Reduced-motion support is strong. Important gaps remain: inconsistent focus-visible states, very
small uppercase metadata, low-contrast secondary text, no skip link, and an unlabelled command
palette dialog pattern.

## AI assistant assessment

### Strengths

- admin-only and client-only routes are separately authenticated;
- client tools use the user's RLS-scoped Supabase session;
- invoice creation follows a reversible draft-first pattern;
- money, outbound messages, document filing, access changes, and contract state have approval gates;
- attachments can be read and filed into the correct operational record;
- meeting, contract, Habitat billing, and client concierge prompts are domain-specific.

### Highest-priority issues

1. The assistant had no current-job context from project pages.
2. Tool results returned application paths, but the chat rendered almost all of them as prose.
3. Client-visible schedule changes ran without approval.
4. Approval execution trusted tool input round-tripped through browser-controlled message history.
5. The company snapshot omitted payables, commitments, and schedule risk.
6. Chat history is still ephemeral and disappears on refresh.
7. Construction coverage is uneven: daily logs, inspections, punch, selections, compliance, and
   purchase-order creation are not complete assistant workflows.

## Implemented in this release

### Company command center

- live receivables, overdue amounts, vendor payables, commitments, and active-job risk;
- one global decision queue for cash, commitments, task exceptions, and compliance;
- denser job portfolio rows with progress, contract, collections, and alert state;
- direct operating-brief prompts into the assistant;
- dashboard loading changed from repeated per-job queries to batched company queries.

### Assistant alignment and safety

- project pages now open a project-scoped assistant;
- the API resolves project context server-side instead of trusting the browser;
- company brief tooling uses the same cash/commitment definitions as the dashboard;
- tool results can emit tappable application and document actions;
- client-visible milestone changes require approval;
- approvals carry an expiring server-signed token that binds the reviewed tool name and input;
- tool progress labels now cover the broader assistant surface.

### Portal and proposal loop

- operational design tokens now apply to portal dashboards;
- client/subcontractor portal navigation has a mobile drawer;
- project section navigation uses a select control on small screens;
- sticky portal chrome is reduced on mobile;
- sent proposals appear in the client portal;
- clients can accept or decline with a note;
- acceptance sets the contract value from the stored proposal, never from browser-submitted money;
- the proposal response is surfaced in the client action queue and notifies admins;
- production RLS allows authenticated clients to read only non-draft proposals on accessible jobs.

## Prioritized roadmap

### P0 — trust, clarity, and measurement

- Persist assistant approval/audit events with actor, reviewed summary, tool, result, and record link.
- Add chat persistence by user and project, with explicit retention and deletion controls.
- Resolve Supabase advisor findings deliberately: leaked-password protection, function grants,
  mutable search paths, and public extension placement.
- Regenerate database types on every migration in CI and fail on drift.
- Add product analytics for workflow starts, completions, abandonments, and time-to-decision.
- Add a skip link, command-palette dialog semantics, and contrast/focus regression checks.

**Success measures:** no approval-input tampering path; zero schema/type drift; workflow completion
and abandonment visible by role.

### P1 — complete field and trade workflows

- Persist daily-log photos with timestamp, author, caption, and client visibility.
- Let clients add punch items, comments, and photos during walkthrough/closeout.
- Complete subcontractor bid detail: scope, plans, attachments, acknowledgement, bid upload,
  alternates, exclusions, and deadline state.
- Show message attachments and read state.
- Add mobile quick capture for field note, photo, inspection, and issue.

**Success measures:** field evidence is entered once; subcontractor bids no longer require manual
re-entry; client punch communication stays inside the record.

### P2 — pre-construction and procurement

- Move accepted proposals into a guided contract/e-sign workflow.
- Add bid comparison with normalized scope, alternates, qualifications, and recommendation history.
- Create/issue purchase orders from awarded bids and track acknowledgement, bill coverage, and lien
  documents.
- Add scope-template governance and variance feedback into future estimates.

**Success measures:** proposal-to-contract and award-to-PO are closed digital loops with no duplicate
typing.

### P3 — financial operations

- Add cash forecasting by expected invoice, due date, payable, committed cost, and schedule phase.
- Add margin-at-completion forecasting and variance explanations.
- Integrate QuickBooks through OAuth with idempotent customer, invoice, payment, vendor, and bill sync.
- Add month-close reconciliation status and exception handling.
- Add configurable approval thresholds for invoices, vendor bills, and purchase orders.

**Success measures:** leadership can answer expected cash and margin without exporting; bookkeeper
exceptions are explicit rather than discovered during month close.

### P4 — construction depth and scale

- Add RFI/submittal records linked to plans, trades, schedule impact, and decisions.
- Add warranty/service requests with owner, SLA, vendor assignment, photos, and closeout proof.
- Introduce project-manager, superintendent, and accounting permission scopes.
- Add crew/capacity planning only after project ownership is modeled.
- Add offline-first field capture if jobsite connectivity proves it necessary.

**Success measures:** responsibilities are scoped; post-close service is traceable; new modules are
added only when their record owner and downstream decision are clear.

## Product decisions to preserve

- Keep Mercury as the primary invoice/payment rail while it fits the company's operating model.
- Keep Habitat/city-budget workflows as a contextual funding mode, not a fork of the whole product.
- Keep public marketing editorial and operational UI calm/data-first.
- Keep AI concise and operational. It should prepare and navigate work, not hide the underlying
  source records.
- Do not chase feature-count parity. Rival construction platforms by closing the exact workflows this
  team uses and making their financial state easier to understand.

## Quality gates for every future workflow

1. Auth and RLS cover each role and cross-project isolation.
2. The record has owner, status, timestamps, evidence, and audit history.
3. Reversible preparation is separated from consequential approval.
4. Empty, loading, error, success, and mobile states are designed.
5. Server-side tests cover money/status calculations and authorization boundaries.
6. Browser verification covers the complete role-to-role flow.
7. AI can read the workflow only when its tool permissions match the UI permissions.
8. Navigation exposes the next action and a direct path to the source record.
