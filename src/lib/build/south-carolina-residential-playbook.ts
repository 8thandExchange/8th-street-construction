/**
 * South Carolina Custom Residential Build Playbook
 * CSRA: North Augusta, Aiken County, Edgefield, Lexington-area cross-border work.
 *
 * References: SC LLR Residential Builders Commission (RBB), Title 40 Ch. 59,
 * SCDHEC stormwater, SC Mechanic's Lien Law, IECC SC amendments.
 */

import type { BuildPlaybook, PlaybookMilestoneTemplate } from "./playbook-types";

export const SOUTH_CAROLINA_RESIDENTIAL_PLAYBOOK: BuildPlaybook = {
  id: "sc-residential-v1",
  name: "South Carolina Custom Residential",
  state: "SC",
  version: "1.0.0",
  description:
    "End-to-end playbook for custom residential new construction in South Carolina — pre-construction through warranty, aligned with SC LLR residential builder requirements, SCDHEC erosion control, termite pretreat, energy code, and mechanic's lien closeout.",
  milestones: [
    {
      phaseKey: "precon",
      title: "Pre-Construction & Approvals",
      description:
        "Contract, RBB compliance, stamped plans, surveys, and local AHJ permits before site work.",
      clientSummary: "Paperwork, plans, and permits — everything before we start on site.",
      tasks: [
        {
          title: "Execute construction contract & deposit",
          description: "Signed agreement with SC-specific lien notice language per S.C. Code Title 29.",
          priority: "urgent",
        },
        {
          title: "Verify SC Residential Builder (RBB) license active",
          description: "Individual RBB via SC LLR; COA on file if operating under LLC/corp. Renew by June 30 of even years.",
          priority: "urgent",
        },
        {
          title: "Confirm $15,000 surety bond on file with LLR",
          description: "Required for residential building over $5,000 when not exempt; original bond with power of attorney.",
          priority: "high",
        },
        {
          title: "Confirm construction financing / draw schedule",
          priority: "high",
        },
        {
          title: "Finalize architectural & structural plans (SC PE stamp)",
          description: "Wind design per local adoption; coastal/inland wind zones as applicable.",
          priority: "urgent",
        },
        {
          title: "Geotechnical / soils report on file",
          description: "SC Piedmont clay and sand — footing and slab design per report.",
          priority: "high",
        },
        {
          title: "Boundary survey & setback verification",
          description: "County plat review — Aiken, Edgefield, Lexington, etc.",
          priority: "high",
        },
        {
          title: "HOA / architectural review (if applicable)",
          priority: "normal",
        },
        {
          title: "Issue selections & allowances schedule",
          priority: "high",
        },
        {
          title: "GL insurance & builder's risk COI active",
          priority: "high",
        },
        {
          title: "File Notice of Commencement (SC Mechanic's Lien Law)",
          description: "File with register of deeds or clerk per S.C. Code — protects lien timeline.",
          priority: "urgent",
        },
        {
          title: "Building permit application to local AHJ",
          description: "County or municipal building department — include energy compliance documentation.",
          priority: "urgent",
        },
      ],
    },
    {
      phaseKey: "sitework",
      title: "Site Work & Earthwork",
      description: "Clearing, SCDHEC stormwater, rough grade, utilities.",
      clientSummary: "Preparing your lot — clearing, grading, and utilities.",
      tasks: [
        {
          title: "SCDHEC stormwater / erosion control plan",
          description: "Land disturbance permits when thresholds met; NOI if NPDES required.",
          priority: "urgent",
        },
        {
          title: "SC 811 utility locate",
          priority: "urgent",
        },
        {
          title: "Clearing & grubbing per tree save plan",
          priority: "high",
        },
        {
          title: "Rough grade & positive drainage",
          priority: "high",
        },
        {
          title: "Temporary power, sanitation, dumpster",
          priority: "normal",
        },
        {
          title: "Footing layout stakeout",
          priority: "high",
        },
        {
          title: "Underground utility stubs before slab",
          priority: "high",
        },
      ],
    },
    {
      phaseKey: "foundation",
      title: "Foundation & Concrete",
      description: "Footings, SC termite pretreat, slab/crawl, foundation inspection.",
      clientSummary: "Foundation and concrete work.",
      tasks: [
        {
          title: "Footing form & rebar inspection",
          priority: "high",
        },
        {
          title: "Termite pretreatment (SC required)",
          description: "Licensed pest control pretreat before slab — certificate for closing file.",
          priority: "urgent",
        },
        {
          title: "Foundation pour & vapor retarder",
          priority: "high",
        },
        {
          title: "Anchor bolts / hurricane ties per design",
          priority: "high",
        },
        {
          title: "Foundation inspection passed (local AHJ)",
          priority: "urgent",
        },
        {
          title: "Waterproofing & footing drains (crawl/basement)",
          priority: "normal",
        },
        { title: "Backfill & compaction per geotech", priority: "normal" },
      ],
    },
    {
      phaseKey: "framing",
      title: "Framing & Dry-In",
      description: "Structure, sheathing, dry-in, framing inspection.",
      clientSummary: "The house takes shape — structure and weather-tight shell.",
      tasks: [
        { title: "Floor system & wall framing", priority: "high" },
        {
          title: "Roof framing, sheathing, uplift connectors",
          description: "SC wind bracing per IRC local amendment.",
          priority: "high",
        },
        {
          title: "Windows & exterior doors with proper flashing",
          priority: "high",
        },
        { title: "WRB & roof underlayment — dry-in", priority: "high" },
        { title: "Framing inspection passed", priority: "urgent" },
        { title: "Roofing dry-in complete", priority: "high" },
      ],
    },
    {
      phaseKey: "mechanical_rough",
      title: "Rough MEP",
      description: "Rough plumbing, electrical, HVAC, inspections.",
      clientSummary: "Rough mechanical, electrical, and plumbing.",
      tasks: [
        { title: "Rough plumbing top-out & pressure test", priority: "high" },
        { title: "Rough electrical (NEC + local amendments)", priority: "high" },
        {
          title: "Rough HVAC — Manual J & SC humidity design",
          priority: "high",
        },
        { title: "Low-voltage rough", priority: "normal" },
        { title: "Gas rough & pressure test (if applicable)", priority: "high" },
        { title: "Rough plumbing inspection passed", priority: "urgent" },
        { title: "Rough electrical inspection passed", priority: "urgent" },
        { title: "Rough mechanical inspection passed", priority: "urgent" },
      ],
    },
    {
      phaseKey: "insulation_envelope",
      title: "Insulation & Envelope",
      description: "SC energy code insulation, drywall.",
      clientSummary: "Insulation and drywall.",
      tasks: [
        {
          title: "Insulation per SC adopted IECC",
          priority: "high",
        },
        { title: "Air sealing / blower door if required", priority: "normal" },
        { title: "Insulation inspection passed", priority: "urgent" },
        { title: "Drywall hang, finish, prime", priority: "high" },
      ],
    },
    {
      phaseKey: "interior_finishes",
      title: "Interior Finishes",
      description: "Trim, cabinets, paint, flooring, trim-out.",
      clientSummary: "Interior finishes and fixtures.",
      tasks: [
        { title: "Interior doors & trim", priority: "normal" },
        { title: "Cabinets & countertop template", priority: "high" },
        { title: "Interior paint & stain", priority: "normal" },
        { title: "Tile & flooring", priority: "high" },
        { title: "Plumbing trim", priority: "normal" },
        { title: "Electrical trim & fixtures", priority: "normal" },
        { title: "HVAC startup & balance", priority: "high" },
        { title: "Appliances", priority: "normal" },
      ],
    },
    {
      phaseKey: "exterior_finishes",
      title: "Exterior Finishes & Flatwork",
      description: "Roof final, cladding, flatwork, final grade.",
      clientSummary: "Exterior completion.",
      tasks: [
        { title: "Final roofing", priority: "high" },
        { title: "Exterior cladding / masonry", priority: "high" },
        { title: "Gutters & downspouts", priority: "normal" },
        { title: "Driveway & flatwork", priority: "normal" },
        { title: "Final grade & landscape prep", priority: "normal" },
        { title: "Exterior paint & hardware", priority: "normal" },
      ],
    },
    {
      phaseKey: "finals",
      title: "Final Inspections & CO",
      description: "MEP finals, building final, certificate of occupancy.",
      clientSummary: "Final inspections and move-in approval.",
      tasks: [
        { title: "Final plumbing inspection", priority: "urgent" },
        { title: "Final electrical inspection", priority: "urgent" },
        { title: "Final mechanical inspection", priority: "urgent" },
        { title: "Building final inspection passed", priority: "urgent" },
        { title: "Certificate of Occupancy issued", priority: "urgent" },
      ],
    },
    {
      phaseKey: "closeout",
      title: "Closeout & Client Handover",
      description: "Punch list, lien waivers, closeout binder.",
      clientSummary: "Walkthrough, punch list, and keys.",
      tasks: [
        { title: "Preliminary punch walk with client", priority: "high" },
        { title: "Punch list complete", priority: "high" },
        {
          title: "Client orientation — systems & maintenance",
          priority: "high",
        },
        {
          title: "Collect unconditional lien waivers (SC)",
          description: "From GC and subs per S.C. Code Title 29 before final payment.",
          priority: "urgent",
        },
        {
          title: "Deliver closeout binder",
          description: "Permits, termite certificate, manuals, as-builts, warranty docs.",
          priority: "high",
        },
        { title: "Final draw / payment", priority: "urgent" },
        { title: "Site cleanup & temp utility removal", priority: "normal" },
      ],
    },
    {
      phaseKey: "warranty",
      title: "Warranty Period",
      description: "Post-occupancy warranty per builder policy.",
      clientSummary: "Warranty service and follow-up.",
      tasks: [
        { title: "30-day warranty check-in", priority: "normal" },
        {
          title: "11-month warranty walk",
          description: "Schedule before one-year anniversary.",
          priority: "high",
        },
        { title: "Close warranty items", priority: "normal" },
        { title: "Termite bond transfer / renew", priority: "normal" },
      ],
    },
  ] satisfies PlaybookMilestoneTemplate[],
};
