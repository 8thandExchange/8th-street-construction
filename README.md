# 8th Street Construction

A complete construction company platform: marketing website, lead capture, consultation booking, content management, client project portal, and subcontractor portal — built on Next.js, Supabase, and Vercel.

A division of 8th and Exchange Capital.

---

## Stack

- **Next.js 14** (App Router, React Server Components, ISR)
- **Supabase** (Postgres + Auth + Storage + Row-Level Security)
- **Resend** (transactional email)
- **Tailwind CSS 3** (custom editorial design system — no shadcn, no template look)
- **TypeScript** end-to-end
- **Vercel** for hosting

## What's in this build (Phase 1)

### Public marketing site
- **Homepage** — editorial-luxury hero, stats, services, process, selected work, testimonials, CTA
- **Projects** (`/projects`) — filterable gallery, gracefully empty until you add content
- **Project detail** (`/projects/[slug]`) — full-bleed hero, narrative, image gallery, metadata strip
- **Services** (`/services`) — six service areas with anchored sections
- **About** (`/about`) — studio story, four operating values, parent org context
- **Contact** (`/contact`) — lead capture form on navy backdrop
- **Book** (`/book`) — 3-step consultation booking with date/time-window selection

### Forms + integrations
- Lead capture → writes to `leads` table → sends notification email to you + confirmation to client
- Consultation requests → writes to `consultations` → sends both emails
- Honeypot anti-spam, Zod validation, UTM capture, rate-friendly server actions

### Admin dashboard (`/admin`)
- **Dashboard** — new leads, pending consultations, active projects, total leads
- **Leads** — filterable list, detail view, status workflow (new → contacted → qualified → proposal_sent → won/lost), internal notes
- **Consultations** — requested → confirmed → completed workflow
- **Projects** — full CMS: create, edit, image management, draft/publish, feature on homepage
- **Testimonials** — inline create, publish/unpublish, feature on homepage
- **Settings** — JSON editor for hero copy, contact info, stats

### Client portal (`/client`)
- Auth-gated, role-based
- Lists projects assigned to the logged-in client
- Per-project view: **Gantt schedule chart** (percent-positioned bars, month axis, today line, past-target flags — driven by `project_milestones.start_date` → `target_date`), progress updates with photos, downloadable documents (signed URLs from the private bucket), contact your PM
- The same Gantt renders on the admin project page ("as the client sees it")
- Read-only in Phase 1 — full CRUD coming in Phase 2 (see [PHASES.md](./PHASES.md))

### Volunteer program (`/volunteer`)
- Public build-day schedule for the Habitat for Humanity partnership — events published at least four weeks out (seeded schedule runs ~5–11 weeks ahead)
- Communication cadence promised on-page and in emails: schedule well in advance → site details one week out → reminder 48 hours before
- Signup form with capacity tracking: confirmed vs. waitlist is computed per event; duplicate emails are deduped; honeypot + rate limiting match the lead form
- Confirmation email to the volunteer + roster notification to `EMAIL_TO_LEADS` (Resend)
- Admin management at `/admin/volunteer`: schedule build days, publish/unpublish, per-event roster with confirm/waitlist/cancel controls
- Tables: `volunteer_events`, `volunteer_signups` (see `supabase/migrations/20260712000000_security_gantt_volunteers.sql`, which also carries RLS hardening for profiles/projects/change orders/audit log and storage policies)

### Subcontractor portal (`/subs`)
- Auth-gated
- Bid requests + active bids visible per subcontractor
- Submission workflow scaffolded — wired up in Phase 3

### Infrastructure
- SEO: sitemap.xml, robots.txt, LocalBusiness JSON-LD
- Magic-link auth via Supabase (no passwords)
- Tight RLS policies on every table — clients only see their projects, subs only see their bids
- ISR with on-demand revalidation (`/api/revalidate`)
- Audit log table (wired in schema, surfaces in Phase 2)

---

## Deployment Guide

### 1 — Get the code into your editor

```bash
unzip 8th-street-construction.zip
cd 8th-street-construction
npm install
```

### 2 — Create your Supabase project

1. Go to <https://supabase.com> and create a new project
2. Pick a region near Augusta (recommend `us-east-1` — Virginia)
3. Wait for it to provision (~2 minutes)

### 3 — Run the database migration

In the Supabase dashboard:
1. Open **SQL Editor** → New Query
2. Open `supabase/migrations/20260515000000_initial_schema.sql` from this project
3. Copy the entire contents into the SQL Editor and click **Run**

This creates: all tables, RLS policies, helper functions (`public.is_admin`, etc.), storage buckets, `updated_at` triggers on public tables, and seed data (site settings + services). Profile rows are **not** auto-created on signup; add them via the service-role client or a Database Webhook (see migration comments).

### 3b — Link the Supabase CLI (optional)

If you use the [Supabase CLI](https://supabase.com/docs/guides/cli), from the project root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

`project_ref` is the subdomain of your API URL (e.g. `abcdxyz` from `https://abcdxyz.supabase.co`). After linking, you can run `supabase db pull`, migration workflows, etc.

### 4 — Configure auth

In Supabase dashboard → **Authentication** → **Providers**:
- Enable **Email** provider
- Disable "Confirm email" if you want instant magic-link sign-in (recommended for owner/admin)

Under **Authentication** → **URL Configuration**:
- Set **Site URL** to `https://8thstreetconstruction.com` (or your Vercel preview URL during testing)
- Add `https://8thstreetconstruction.com/auth/callback` and `http://localhost:3000/auth/callback` to **Redirect URLs**

### 5 — Set up Resend for email

1. Sign up at <https://resend.com> (free tier: 100 emails/day, 3,000/month — plenty for now)
2. Verify your sending domain (`8thandexchange.com`) by adding the DNS records they provide
3. Create an API key

### 6 — Configure environment variables

Copy `.env.local.example` → `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
EMAIL_FROM="8th Street Construction <construction@8thandexchange.com>"
EMAIL_TO_LEADS=construction@8thandexchange.com
NEXT_PUBLIC_SITE_URL=https://8thstreetconstruction.com
REVALIDATE_SECRET=any-long-random-string-you-make-up
```

Get the Supabase keys from: Project Settings → API

### 7 — Run locally

```bash
npm run dev
```

Visit <http://localhost:3000>. The site should load with the empty-portfolio state and the seeded services on the services page.

### 8 — Create your admin account

1. Visit <http://localhost:3000/login>
2. Enter your email → check inbox → click the magic link  
   This creates a row in `auth.users` only. **Add a matching profile** (migration no longer uses an `auth.users` trigger):

   In Supabase **SQL Editor**:

   ```sql
   insert into public.profiles (id, email, role, first_name, last_name)
   select id, email, 'client', '', ''
   from auth.users
   where email = 'your-email@example.com'
   on conflict (id) do nothing;
   ```

3. Promote yourself to admin:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

4. Sign out and sign back in. You should now be redirected to `/admin`.

### 9 — Deploy to Vercel

1. Push the code to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Phase 1"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/8th-street-construction.git
   git push -u origin main
   ```

2. Go to <https://vercel.com> → **New Project** → Import your repo
3. Framework preset will auto-detect Next.js
4. Add all environment variables from `.env.local` to Vercel's **Environment Variables** section
5. Click **Deploy**

### 10 — Cut over the domain

Your live site will be at `your-project.vercel.app`. Test it. Then:

1. In Vercel: **Settings** → **Domains** → Add `8thstreetconstruction.com` and `www.8thstreetconstruction.com`
2. Vercel will show you DNS records to update at your registrar (or wherever your DNS lives — looks like Hostinger right now)
3. Update DNS:
   - Apex domain (`8thstreetconstruction.com`) → **A record** to `76.76.21.21`
   - `www` subdomain → **CNAME** to `cname.vercel-dns.com`
4. Wait for propagation (5 minutes to a few hours)
5. Update Supabase auth URL configuration to use the production domain

### 11 — Update Supabase auth Site URL

Once production is live, update the Site URL in Supabase **Authentication** → **URL Configuration** to your production domain so magic-link emails point to the right place.

---

## Local Development Workflow

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

---

## Adding content

### A new project
1. Go to `/admin/projects` → **+ New Project**
2. Fill in details. Set status to **Draft** while you work
3. Save, then upload images: in Supabase dashboard → **Storage** → `project-images` bucket → upload, copy public URL
4. Paste URL in the project's "Add Image" form
5. Change status to **Completed** (or **In Progress**) to publish

### A new testimonial
`/admin/testimonials` → fill out the inline form. Check "Feature on homepage" if you want it visible.

### Adding a client account
1. Have the client sign up at `/login` with their email (they'll receive a magic link)
2. In Supabase SQL Editor, link them to a project:
```sql
update public.projects
set client_id = (select id from auth.users where email = 'client@example.com')
where slug = 'their-project-slug';
```

### Adding a subcontractor account
1. They sign up at `/login`
2. Promote their profile role:
```sql
update public.profiles set role = 'subcontractor' where email = 'sub@example.com';

insert into public.subcontractors (profile_id, company_name, trade, primary_contact_name, primary_contact_email)
values (
  (select id from auth.users where email = 'sub@example.com'),
  'Acme Plumbing LLC',
  'plumbing',
  'John Doe',
  'sub@example.com'
);
```

---

## Important file locations

```
src/
  app/                    # Routes (App Router)
    page.tsx              # Homepage
    layout.tsx            # Root layout + fonts + metadata
    admin/                # Admin dashboard
    client/               # Client portal
    subs/                 # Subcontractor portal
    api/                  # API routes (leads, bookings, revalidate)
  components/
    site/                 # Public site components (header, footer)
    ui/                   # Design system primitives (Button, Field, etc)
    forms/                # LeadForm, BookingForm
    admin/                # AdminSidebar, StatCard, ProjectFormFields
    portal/               # PortalShell (client + subs)
  lib/
    supabase/             # Browser, server, admin clients + middleware
    email/                # Resend wrapper + templates
    validations.ts        # Zod schemas
    utils.ts              # Helpers + label maps
supabase/
  migrations/             # SQL schema (source of truth)
tailwind.config.ts        # Design tokens (colors, fonts, animations)
```

---

## Next phases

See [PHASES.md](./PHASES.md) for the full Phase 2/3/4 roadmap with Cursor-ready prompts.

**Phase 1 (this build) is done.** Phase 2 deepens the client portal into a real PM tool (milestone CRUD, document uploads, in-portal messaging). Phase 3 wires up the subcontractor bidding workflow end-to-end (RFQ creation, bid submission, awarding). Phase 4 is the marketing engine (SEO content, automated nurture sequences, analytics).

---

## Built by

8th and Exchange Capital · Augusta, GA · 2026
