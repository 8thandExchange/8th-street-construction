# Build Phases

Phase 1 is shipped. This document maps out the work ahead and gives you Cursor-ready prompts to drive each phase. Hand these to Cursor in your local IDE; the database schema already supports everything below, so it's all UI + server-action work.

---

## Phase 1 — Foundation (✅ DONE)

What this delivers, all live:

- Marketing site (homepage, projects, services, about, contact, book)
- Lead capture + consultation booking (with email notifications via Resend)
- Admin CMS (leads, consultations, projects with image management, testimonials, settings)
- Magic-link authentication for all three roles
- Client portal — read-only project view with milestones, updates, documents
- Subcontractor portal — bid list (read-only)
- Full database schema with RLS for everything in Phases 2/3
- SEO infrastructure (sitemap, robots, JSON-LD)

**You can run your business on this today.** Phases 2–4 turn the portals into real operating tools.

---

## Phase 2 — Client Portal Depth (Buildertrend-class PM)

Goal: project managers run construction from `/admin`; clients see real-time progress in `/client`. No email back-and-forth required.

### What to build

1. **Milestone CRUD in admin** — `/admin/projects/[id]/milestones`
   - Create/edit/delete milestones with title, description, target_date, status, dependencies
   - Drag-and-drop reordering
   - Status workflow with auto-timestamping (started_at, completed_at)

2. **Progress updates with photo uploads** — `/admin/projects/[id]/updates/new`
   - Markdown body
   - Multi-image upload directly to Supabase Storage `project-updates` bucket
   - "Notify client" checkbox → fires email + (later) push notification
   - Client sees these chronologically in their portal

3. **Document management** — `/admin/projects/[id]/documents`
   - Upload PDFs/images to `project-documents` bucket
   - Categorize (contract, permit, plan, invoice, etc.)
   - Visibility toggle (admin-only vs. client-visible)
   - E-signature integration (Phase 2.5) — wire to DocuSign or SignWell

4. **In-portal messaging** — `project_messages` table is already in schema
   - Thread view per project
   - File attachments
   - Email-on-new-message notification
   - Read receipts

5. **Change orders** — `change_orders` table is already in schema
   - Admin creates → client approves/rejects in portal
   - Update project budget when approved
   - Audit trail

### Cursor prompt for Phase 2

> Implement Phase 2 of the 8th Street Construction platform. The schema in `supabase/migrations/20260515000000_initial_schema.sql` already has all necessary tables (`project_milestones`, `project_updates`, `project_update_images`, `project_documents`, `project_messages`, `change_orders`) with RLS in place. Build:
>
> 1. `/admin/projects/[id]/milestones` — full CRUD page using server actions. Match the editorial style of `/admin/projects/[id]/page.tsx`. Include drag-to-reorder using `@dnd-kit/core`.
> 2. `/admin/projects/[id]/updates/new` — form with multi-image upload to Supabase Storage (`project-updates` bucket). Use the Supabase JS client. On submit, optionally fire an email to the project's `client_id` via Resend.
> 3. `/admin/projects/[id]/documents` — upload form (Supabase Storage `project-documents` bucket), list, categorize, visibility toggle.
> 4. `/client/projects/[id]/messages` and `/admin/projects/[id]/messages` — threaded conversation UI backed by `project_messages`. Server-render initial messages; use Supabase Realtime for live updates.
> 5. `/client/projects/[id]/change-orders` — list of change orders with approve/reject buttons. Admin route to create them at `/admin/projects/[id]/change-orders/new`.
>
> Follow the existing design system: Instrument Serif for display, Manrope for body, copper #B86F3E accent, bone backgrounds, navy for dark sections. Use the `Reveal`, `Container`, `Button`, `Field` primitives. Server actions for all mutations, with `revalidatePath` calls. RLS is already enforcing permissions — trust it but verify in your testing.

---

## Phase 3 — Subcontractor Bidding Workflow

Goal: replace email spreadsheets with a real bidding system. Admin creates RFQs, invites subs, sees bids side-by-side, awards work.

### What to build

1. **RFQ creation** — `/admin/projects/[id]/bid-requests/new`
   - Title, trade, scope_of_work, bid_deadline, estimated_budget
   - Document attachments (plans, specs)
   - Multi-select of invited subcontractors

2. **Sub invitation flow**
   - When admin invites subs to a bid_request, automatically insert `bids` rows with status `invited`
   - Send email to each sub linking to `/subs`

3. **Bid submission in `/subs`** — `/subs/bids/[id]`
   - Sub sees scope + attachments
   - Submits amount, optional cover note, document attachments
   - Status moves: invited → viewed → submitted

4. **Bid comparison in `/admin`** — `/admin/projects/[id]/bid-requests/[bidId]`
   - Side-by-side comparison of all submitted bids
   - Award button → status → `awarded`, auto-creates a contract record (Phase 3.5)
   - Other bids get `declined` status

5. **Sub roster management** — `/admin/subcontractors`
   - Full CRUD on the `subcontractors` table
   - Track insurance expiration, license expiration, ratings
   - Filter by trade for quick invitation lists

### Cursor prompt for Phase 3

> Implement Phase 3 of the 8th Street Construction platform. Build the subcontractor bidding workflow. The `bid_requests`, `bids`, and `subcontractors` tables are already in schema with RLS. Build:
>
> 1. `/admin/subcontractors` — list view + create/edit forms for sub roster (company_name, trade, contacts, insurance/license tracking, ratings).
> 2. `/admin/projects/[id]/bid-requests/new` — create RFQ with multi-select of subs to invite. On submit, insert bid_request and one `bids` row per invited sub with `status='invited'`. Send invitation email via Resend.
> 3. `/subs/bids/[id]` — sub views the scope, scope documents, and submits their bid (amount, cover_note, attachments). Update status to `submitted` and set `submitted_at`.
> 4. `/admin/projects/[id]/bid-requests/[id]` — admin sees all bids side-by-side in a comparison table. Award button (server action) sets winning bid to `awarded`, others to `declined`, and triggers an email to all subs notifying them of the outcome.
> 5. Update `/admin/projects/[id]` to show a tab/section listing all bid requests for that project.
>
> Follow the existing design system. Use server actions and `revalidatePath`. Reference the Phase 1 admin routes for styling patterns.

---

## Phase 4 — Marketing Engine

Goal: site doesn't just convert visitors who arrive — it pulls them in.

### What to build

1. **Blog / Journal** — `/journal`
   - MDX-based or Supabase-backed `posts` table (your choice)
   - Categories: project spotlights, building science, market commentary, behind-the-scenes
   - Featured posts on homepage

2. **Location pages** — `/locations/[slug]`
   - "Augusta Custom Home Builders", "North Augusta Commercial Construction", etc.
   - Programmatic SEO — each driven by a row in a `locations` table
   - Local schema markup per page

3. **Service-specific landing pages**
   - `/services/custom-homes` (deep page beyond the section)
   - Targeted to ad campaigns with conversion-optimized layout

4. **Lead nurture sequences**
   - Resend Audiences integration
   - Auto-add new leads to a sequence
   - 5-email nurture: welcome → portfolio showcase → process explainer → testimonial-led case study → meeting CTA

5. **Analytics**
   - Vercel Analytics (built-in)
   - Conversion tracking on form submissions
   - UTM dashboard in `/admin/marketing`

6. **Reviews aggregation**
   - Pull Google Business Profile reviews via API
   - Display alongside owned testimonials

### Cursor prompt for Phase 4

> Implement Phase 4 of the 8th Street Construction platform — the marketing engine. Add:
>
> 1. A new `posts` table to the schema (id, slug, title, excerpt, body_mdx, hero_image_url, category, author_id, published_at, featured, meta_description). Add RLS: public read for published, admin write.
> 2. `/journal` and `/journal/[slug]` routes — MDX rendering with `next-mdx-remote`. Editorial layout matching the existing design language.
> 3. `/admin/journal` — full CRUD for blog posts with MDX editor.
> 4. `/locations/[slug]` — programmatic SEO pages. Add `locations` table (slug, name, lat, lng, description, hero_image_url, services_offered text[]). Generate pages with localized H1, content, and LocalBusiness JSON-LD per location.
> 5. Resend Audiences integration in `src/lib/email/resend.ts`. When a lead is created, add to audience `audience_nurture`. Set up 5-email sequence in Resend dashboard.
> 6. `/admin/marketing` — analytics dashboard showing UTM source/medium/campaign breakdown of leads (groupable, filterable, time-ranged).
>
> Maintain the editorial-luxury design language across all new surfaces.

---

## Phase 4.5+ — What comes after

These are flagged but lower-priority:
- **Draws & invoicing** — `invoices` and `draws` tables. Stripe ACH integration.
- **Punch list** — per-project itemized completion tracking, shared with client.
- **Selections / allowances** — client-facing fixture and finish picker with budget tracking.
- **Crew scheduling** — calendar view of trade scheduling per project.
- **Inspection tracking** — code inspections with pass/fail status.
- **Warranty management** — auto-create warranty period after completion, track service requests.

The Buildertrend feature parity story is roughly: Phases 2-3 = MVP, Phase 4.5+ = full platform.

---

## A note on what to build first

If you have active clients right now, **Phase 2 first**. The marketing engine (Phase 4) is leverage, but Phase 2 makes you operationally better immediately — and the difference clients feel is what generates referrals, which is the highest-quality lead source you have.

Phase 3 lands when you're regularly bidding work to multiple subs and the email/spreadsheet pattern is breaking down. If you're not there yet, defer it.
