# Georgia Residential Build System

This is the **reproducible operating system** behind the login — modeled on platforms like Buildertrend/Buildr, tuned for **custom residential construction in Georgia** (CSRA: Augusta, Evans, Martinez, Grovetown, North Augusta).

## Playbook: `ga-residential-v1`

**11 client-visible phases** (milestones on Timeline) + **~70 internal checklist tasks** per project.

| Phase | What it covers |
|-------|----------------|
| Pre-Construction & Approvals | Contract, financing, stamped plans, soils, survey, NOC, permits |
| Site Work & Earthwork | Clearing, 811, erosion control (GA EPD), rough grade |
| Foundation & Concrete | Footings, **termite pretreat (GA required)**, slab, foundation inspection |
| Framing & Dry-In | Structure, wind connectors, WRB, framing inspection |
| Rough MEP | Plumbing, electrical, HVAC (Manual J / humidity), rough inspections |
| Insulation & Envelope | GA energy code, insulation inspection, drywall |
| Interior Finishes | Cabinets, trim, paint, flooring, trim-out |
| Exterior Finishes & Flatwork | Roof, cladding, gutters, driveway, final grade |
| Final Inspections & CO | MEP finals, building final, certificate of occupancy |
| Closeout & Handover | Punch list, orientation, **Georgia lien waivers**, closeout binder |
| Warranty Period | 30-day check-in, 11-month walk, termite bond transfer |

Source of truth: `src/lib/build/georgia-residential-playbook.ts`

## Using it in admin

1. **New job:** Admin → Projects → **Start a Build** — check “Apply Georgia playbook” (default on).
2. **Existing job:** Project → **Build System** → **Apply Playbook**.
3. **Daily work:** **Checklists** — check off tasks phase by phase.
4. **Client view:** **Timeline** — milestones auto-sync from playbook (mark complete as phases finish).

## 608 Macon Ave

After migration, seed the active job:

```bash
export $(grep -E '^NEXT_PUBLIC_SUPABASE_URL=|^SUPABASE_SERVICE_ROLE_KEY=' .env.local | xargs)
npx tsx scripts/seed-608-macon.ts
```

**Cost plan** (our internal estimate — NOT client billing):

```bash
npx tsx scripts/seed-608-macon.ts --cost-plan
```

**Habitat portal contact** (messages, updates, invoices):

```bash
npx tsx scripts/seed-608-macon.ts --client
# Or set HABITAT_CLIENT_EMAIL=contact@example.org
```

Both together:

```bash
npx tsx scripts/seed-608-macon.ts --cost-plan --client
```

Then open **Admin → Company Home → 608 Macon → Master Board**.

Three money buckets per job:
- **Our Cost Plan** — internal estimator (refine as sub quotes arrive)
- **Sub Quotes** — what subs actually bid (enter manually or scan PDF)
- **Client Invoices** — what Habitat or the homeowner pays you

## Roadmap (Buildertrend-class)

| Next | Feature |
|------|---------|
| 2B ✅ | Phase checklists (this release) |
| 2C | Schedule dates + critical path per phase |
| 2D | Daily logs + weather |
| 3 | Sub RFQs & bids |
| 4 | Draw schedule + Stripe invoicing |
| 5 | Selections workbook (allowances) |
| 6 | Punch list module |
| 7 | Warranty tickets |

## Georgia-specific notes baked in

- Notice of Commencement (O.C.G.A.)
- Termite pretreatment certificate before slab
- Erosion & sediment control / NPDES when applicable
- Wind bracing / connector schedule
- IECC Georgia insulation & envelope
- Unconditional lien waivers at closeout
- 11-month warranty walk (builder best practice)

Jurisdiction field on each project captures local AHJ (e.g. City of Augusta, Richmond County; Columbia County; Aiken County).
