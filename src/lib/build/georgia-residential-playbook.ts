/**
 * Georgia Custom Residential Build Playbook
 * CSRA: Augusta, Evans, Martinez, Grovetown (GA side).
 */

import type { BuildPlaybook, PlaybookMilestoneTemplate } from "./playbook-types";

export type { PlaybookTaskTemplate, PlaybookMilestoneTemplate } from "./playbook-types";

export const GEORGIA_RESIDENTIAL_PLAYBOOK: BuildPlaybook = {
  id: "ga-residential-v1",
  name: "Georgia Custom Residential",
  state: "GA",
  version: "1.0.0",
  description:
    "End-to-end playbook for custom residential new construction in Georgia — pre-construction through warranty closeout, aligned with typical CSRA inspection sequences and state requirements (termite pretreat, erosion control, energy code, lien waivers).",
  milestones: [
    {
      phaseKey: "precon",
      title: "Pre-Construction & Approvals",
      description:
        "Contract, financing, stamped plans, surveys, and authority approvals before breaking ground.",
      clientSummary: "Paperwork, plans, and permits — everything before we start on site.",
      tasks: [
        {
          title: "Execute construction contract & deposit",
          description: "Signed agreement, scope of work, allowance schedule, and draw schedule attached.",
          priority: "urgent",
        },
        {
          title: "Confirm construction financing / draw schedule",
          description: "Lender inspection requirements documented; title company and draw contact on file.",
          priority: "high",
        },
        {
          title: "Finalize architectural & structural plans",
          description: "Stamped plans per Georgia practice; structural calcs for wind/bracing per local design criteria.",
          priority: "urgent",
        },
        {
          title: "Geotechnical / soils report on file",
          description: "Critical in Georgia clay — footing design, slab design, and fill/compaction specs.",
          priority: "high",
        },
        {
          title: "Boundary survey & building setback verification",
          description: "Confirm setbacks, easements, and floodplain status with surveyor plat.",
          priority: "high",
        },
        {
          title: "HOA / ARC approval (if applicable)",
          description: "Written approval before exterior selections finalized or site work begins.",
          priority: "normal",
        },
        {
          title: "Issue selections & allowances schedule to client",
          description: "Deadline-driven finish schedule — cabinets, flooring, fixtures, exterior materials.",
          priority: "high",
        },
        {
          title: "Builder risk insurance & GL COI active",
          description: "Policy dates cover project duration; additional insured endorsements as required.",
          priority: "high",
        },
        {
          title: "File Notice of Commencement (Georgia)",
          description: "Recorded with clerk of court per O.C.G.A. — protects lien rights timeline.",
          priority: "high",
        },
        {
          title: "Building permit application submitted",
          description: "City/county jurisdiction (e.g. Augusta-Richmond, Columbia Co., Aiken Co.) — include plan set & energy forms.",
          priority: "urgent",
        },
      ],
    },
    {
      phaseKey: "sitework",
      title: "Site Work & Earthwork",
      description: "Clearing, erosion control, rough grade, and utilities stub per Georgia EPD and local codes.",
      clientSummary: "Preparing your lot — clearing, grading, and getting utilities to the house.",
      tasks: [
        {
          title: "Install erosion & sediment controls",
          description: "Silt fence, construction entrance, inlet protection — NPDES if >1 acre disturbed (GA EPD).",
          priority: "urgent",
        },
        {
          title: "Utility locates (Georgia 811)",
          description: "Call Before You Dig — document ticket numbers before excavation.",
          priority: "urgent",
        },
        {
          title: "Clearing & grubbing per tree save plan",
          description: "Protect designated trees; debris haul-off and burn permit if applicable.",
          priority: "high",
        },
        {
          title: "Rough grade & positive drainage away from foundation",
          description: "Minimum 6\" fall in first 10' per IRC; swales to storm system or approved discharge.",
          priority: "high",
        },
        {
          title: "Temporary power / water / sanitation",
          description: "Temp pole inspection if required; porta-potty and dumpster placed.",
          priority: "normal",
        },
        {
          title: "Footing excavation layout stakeout",
          description: "Survey/builder verification of corners, elevation, and garage floor height.",
          priority: "high",
        },
        {
          title: "Underground plumbing stub (if applicable)",
          description: "Before slab pour — sewer/septic stub, water line, and sleeve locations verified.",
          priority: "high",
        },
      ],
    },
    {
      phaseKey: "foundation",
      title: "Foundation & Concrete",
      description: "Footings, termite pretreatment, slab or crawl foundation, and first inspections.",
      clientSummary: "Foundation and concrete — the base everything else sits on.",
      tasks: [
        {
          title: "Footing form & rebar inspection",
          description: "Pre-pour check against structural; step footings and load paths verified.",
          priority: "high",
        },
        {
          title: "Termite pretreatment (Georgia required)",
          description: "Licensed pest control pretreat before slab/floor system — keep certificate for closing folder.",
          priority: "urgent",
        },
        {
          title: "Foundation pour & vapor retarder",
          description: "Monolithic or stem wall per plan; vapor barrier under slab in conditioned space.",
          priority: "high",
        },
        {
          title: "Anchor bolt / hold-down placement",
          description: "Per wind bracing schedule — coastal/inland wind zones per local amendment.",
          priority: "high",
        },
        {
          title: "Foundation / footing inspection passed",
          description: "County/city inspector sign-off before backfill or framing.",
          priority: "urgent",
        },
        {
          title: "Waterproofing & drain board (if basement/crawl)",
          description: "Foundation dampproofing, footing drains, and crawl venting per code.",
          priority: "normal",
        },
        {
          title: "Backfill & compaction",
          description: "Layered fill per geotech; no organics; slope grade away from walls.",
          priority: "normal",
        },
      ],
    },
    {
      phaseKey: "framing",
      title: "Framing & Dry-In",
      description: "Structure, sheathing, roof dry-in, windows, and framing inspection.",
      clientSummary: "The house takes shape — walls, roof, and weather-tight shell.",
      tasks: [
        {
          title: "Floor system & wall framing",
          description: "Layout verified to plan; bearing points, headers, and engineered lumber per spec.",
          priority: "high",
        },
        {
          title: "Roof framing & sheathing",
          description: "Hurricane clips / uplift connectors per GA wind design; nail schedule documented.",
          priority: "high",
        },
        {
          title: "Windows & exterior doors installed",
          description: "Flashing pan, head flashing, and WRB integration — critical for Georgia humidity/rain.",
          priority: "high",
        },
        {
          title: "House wrap / WRB & roof underlayment",
          description: "Dry-in achieved — synthetic underlayment or felt per manufacturer and code.",
          priority: "high",
        },
        {
          title: "Framing inspection passed",
          description: "Structural, fire blocking, egress, and stair framing signed off.",
          priority: "urgent",
        },
        {
          title: "Roofing dry-in complete",
          description: "Temporary or permanent roof to protect interior trades.",
          priority: "high",
        },
        {
          title: "Exterior rough measurements for trim/masonry",
          description: "Verify openings for brick, stone, or siding production.",
          priority: "normal",
        },
      ],
    },
    {
      phaseKey: "mechanical_rough",
      title: "Rough MEP",
      description: "Rough plumbing, electrical, HVAC, and low-voltage before insulation.",
      clientSummary: "Behind the walls — plumbing, electrical, and HVAC rough-in.",
      tasks: [
        {
          title: "Rough plumbing top-out",
          description: "DWV, water supply, venting, hose bibs — pressure test documented.",
          priority: "high",
        },
        {
          title: "Rough electrical",
          description: "NEC + local amendments; AFCI/GFCI per code; panel schedule on file.",
          priority: "high",
        },
        {
          title: "Rough HVAC & Manual J verification",
          description: "Duct layout, returns sized for Georgia humidity loads; equipment locations set.",
          priority: "high",
        },
        {
          title: "Low-voltage rough (data, security, AV prewire)",
          description: "Per low-voltage plan; label homeruns at panel.",
          priority: "normal",
        },
        {
          title: "Gas line rough (if applicable)",
          description: "Pressure test and inspector approval before cover-up.",
          priority: "high",
        },
        {
          title: "Rough plumbing inspection passed",
          priority: "urgent",
        },
        {
          title: "Rough electrical inspection passed",
          priority: "urgent",
        },
        {
          title: "Rough mechanical inspection passed",
          priority: "urgent",
        },
      ],
    },
    {
      phaseKey: "insulation_envelope",
      title: "Insulation & Envelope",
      description: "Georgia energy code insulation, air sealing, and drywall readiness.",
      clientSummary: "Insulation and air sealing — comfort and efficiency before drywall.",
      tasks: [
        {
          title: "Insulation install per GA energy code",
          description: "R-values walls/ceiling/floor per IECC Georgia amendment; baffles at eaves.",
          priority: "high",
        },
        {
          title: "Air sealing & blower door (if required)",
          description: "Seal penetrations; coordinate third-party testing if jurisdiction requires.",
          priority: "normal",
        },
        {
          title: "Insulation / envelope inspection passed",
          priority: "urgent",
        },
        {
          title: "Drywall delivery & moisture acclimation",
          description: "Store flat; HVAC running if enclosure closed — Georgia humidity control.",
          priority: "normal",
        },
        {
          title: "Drywall hang, finish, prime",
          description: "Level 4/5 per spec; tile wet areas backed correctly.",
          priority: "high",
        },
      ],
    },
    {
      phaseKey: "interior_finishes",
      title: "Interior Finishes",
      description: "Cabinets, trim, paint, flooring, and fixture trim.",
      clientSummary: "Interior finishes — where your selections come to life.",
      tasks: [
        {
          title: "Interior doors & trim installed",
          priority: "normal",
        },
        {
          title: "Cabinet install & template countertops",
          description: "Field verify overhangs, appliance clearances, and soft-close hardware.",
          priority: "high",
        },
        {
          title: "Interior paint & stain complete",
          priority: "normal",
        },
        {
          title: "Tile & flooring install",
          description: "Moisture mitigation on slab if needed; acclimate hardwood/LVP per manufacturer.",
          priority: "high",
        },
        {
          title: "Plumbing trim & fixtures",
          priority: "normal",
        },
        {
          title: "Electrical trim, devices, & fixtures",
          priority: "normal",
        },
        {
          title: "HVAC registers, thermostat, startup & balance",
          description: "Commission system — critical for Georgia cooling/dehumidification performance.",
          priority: "high",
        },
        {
          title: "Appliance delivery & hookup",
          priority: "normal",
        },
      ],
    },
    {
      phaseKey: "exterior_finishes",
      title: "Exterior Finishes & Flatwork",
      description: "Roofing final, siding/masonry, gutters, driveway, and final grade.",
      clientSummary: "Exterior completion — curb appeal and drainage finished.",
      tasks: [
        {
          title: "Final roofing install",
          priority: "high",
        },
        {
          title: "Exterior cladding (brick, stone, siding, stucco)",
          description: "Weep screeds, flashings, and expansion joints per manufacturer.",
          priority: "high",
        },
        {
          title: "Gutters & downspouts tied to drainage plan",
          priority: "normal",
        },
        {
          title: "Driveway / walks / flatwork pour",
          priority: "normal",
        },
        {
          title: "Final grade & landscape bed prep",
          description: "Positive drainage maintained; sod/seed per contract scope.",
          priority: "normal",
        },
        {
          title: "Exterior paint / stain & hardware",
          priority: "normal",
        },
      ],
    },
    {
      phaseKey: "finals",
      title: "Final Inspections & CO",
      description: "MEP finals, building final, certificate of occupancy.",
      clientSummary: "Final inspections and approval to move in.",
      tasks: [
        {
          title: "Final plumbing inspection",
          priority: "urgent",
        },
        {
          title: "Final electrical inspection",
          priority: "urgent",
        },
        {
          title: "Final mechanical inspection",
          priority: "urgent",
        },
        {
          title: "Building final inspection passed",
          description: "All life-safety items closed; address posted if required.",
          priority: "urgent",
        },
        {
          title: "Certificate of Occupancy issued",
          description: "Or equivalent final approval from AHJ — required before occupancy.",
          priority: "urgent",
        },
        {
          title: "Fireplace / gas log inspection (if applicable)",
          priority: "normal",
        },
      ],
    },
    {
      phaseKey: "closeout",
      title: "Closeout & Client Handover",
      description: "Punch list, orientation, lien waivers, and document package.",
      clientSummary: "Walkthrough, punch list, and keys — welcome home.",
      tasks: [
        {
          title: "Preliminary punch list walk (builder + client)",
          priority: "high",
        },
        {
          title: "Punch list complete & verified",
          priority: "high",
        },
        {
          title: "Client orientation — systems & maintenance",
          description: "HVAC filters, irrigation, water shutoffs, GFCI/AFCI, attic access, termite bond transfer.",
          priority: "high",
        },
        {
          title: "Collect unconditional lien waivers (Georgia)",
          description: "From GC and subs prior to final draw / closing with lender.",
          priority: "urgent",
        },
        {
          title: "Deliver closeout binder",
          description: "Manuals, warranties, as-builts, permit cards, termite certificate, appliance registrations.",
          priority: "high",
        },
        {
          title: "Final draw / final payment processed",
          priority: "urgent",
        },
        {
          title: "Remove temp utilities & site cleanup",
          priority: "normal",
        },
      ],
    },
    {
      phaseKey: "warranty",
      title: "Warranty Period",
      description: "Post-occupancy warranty tracking per builder policy.",
      clientSummary: "We're still here — warranty service and follow-up.",
      tasks: [
        {
          title: "30-day warranty check-in",
          priority: "normal",
        },
        {
          title: "11-month warranty walk (before 1-year)",
          description: "Schedule before anniversary — standard builder warranty practice in Georgia.",
          priority: "high",
        },
        {
          title: "Document & close warranty items",
          priority: "normal",
        },
        {
          title: "Transfer termite bond / renew if builder-provided",
          priority: "normal",
        },
      ],
    },
  ] satisfies PlaybookMilestoneTemplate[],
};
