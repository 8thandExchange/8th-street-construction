/**
 * The standard construction agreements and the machinery that turns one
 * into a per-job contract.
 *
 * The single-family text is the signed 608 Macon agreement (July 2026)
 * generalized with merge fields, plus protections added when it became
 * the company standard: an express no-retainage clause, a materials
 * escalation clause, an Owner Responsibilities section, termination
 * terms, a subrogation waiver, and a warranty claim procedure. The
 * multifamily variant adapts the code references, allows phased
 * completion per building, and addresses retainage explicitly.
 *
 * These are templates, not legal advice. Have a Georgia construction
 * attorney review before first use on a new counterparty type.
 */

export type ContractMergeFields = {
  owner_name: string;              // "Habitat for Humanity — CSRA, Inc."
  owner_entity_description: string; // "a Georgia nonprofit corporation"
  property_address: string;        // "608 Macon Avenue, Augusta, Richmond County, Georgia 30901"
  county: string;                  // "Richmond"
  project_name: string;            // "608 Macon Avenue Residence" (lien waiver title)
  contract_price: string;          // "$239,665"
  contract_price_words: string;    // "Two Hundred Thirty-Nine Thousand ... Dollars"
  effective_date: string;          // "Monday, July 13, 2026"
  plans_description: string;       // "the Booker + Vick Architects permit set, Job No. 2615, dated May 21, 2026"
  scope_description: string;       // one paragraph, what the Work includes
  owner_signatory: string;         // "Bernadette Kelliher, CEO"
  contractor_signatory: string;    // "Troy W. Akers, Managing Principal"
};

export const MERGE_FIELD_KEYS: (keyof ContractMergeFields)[] = [
  "owner_name",
  "owner_entity_description",
  "property_address",
  "county",
  "project_name",
  "contract_price",
  "contract_price_words",
  "effective_date",
  "plans_description",
  "scope_description",
  "owner_signatory",
  "contractor_signatory",
];

/** Replace {{tokens}}. Unknown tokens are left visible so nothing silently drops. */
export function mergeContractTemplate(
  body: string,
  fields: ContractMergeFields
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => {
    const v = (fields as Record<string, string>)[key];
    return v !== undefined && v !== "" ? v : whole;
  });
}

/** True when a merged body still carries unfilled {{tokens}}. */
export function hasUnmergedFields(body: string): boolean {
  return /\{\{\w+\}\}/.test(body);
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
  "Eighty", "Ninety",
];

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    const ten = TENS[Math.floor(n / 10)];
    parts.push(n % 10 ? `${ten}-${ONES[n % 10]}` : ten);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** "$239,665.00" style amounts to contract words: "Two Hundred Thirty-Nine Thousand Six Hundred Sixty-Five and 00/100 Dollars". */
export function dollarsToWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0 || amount >= 1e12) {
    throw new Error("Amount out of range for words");
  }
  const cents = Math.round(amount * 100) % 100;
  let dollars = Math.floor(amount);
  if (dollars === 0) return `Zero and ${String(cents).padStart(2, "0")}/100 Dollars`;

  const scales: [number, string][] = [
    [1_000_000_000, "Billion"],
    [1_000_000, "Million"],
    [1_000, "Thousand"],
    [1, ""],
  ];
  const parts: string[] = [];
  for (const [scale, label] of scales) {
    if (dollars >= scale) {
      const chunk = Math.floor(dollars / scale);
      dollars %= scale;
      parts.push(label ? `${belowThousand(chunk)} ${label}` : belowThousand(chunk));
    }
  }
  return `${parts.join(" ")} and ${String(cents).padStart(2, "0")}/100 Dollars`;
}

export function usd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
}

/** "2026-07-13" to "Monday, July 13, 2026". */
export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* =====================================================================
 * Shared clauses. Both templates are assembled from these so an edit to
 * a common clause lands in both standards.
 * ===================================================================== */

const PREAMBLE = `THIS RESIDENTIAL CONSTRUCTION AGREEMENT (this "Agreement") is made as of {{effective_date}}, between {{owner_name}}, {{owner_entity_description}} ("Owner"), and 8th Street Construction LLC, a Georgia limited liability company ("Contractor"), for the construction described below at {{property_address}} (the "Property"). Owner and Contractor are each a "Party" and together the "Parties."`;

const PAYMENT = `## 3. Payment

3.1 The Contract Price is paid in progress draws based on invoices provided by Contractor, not to exceed once every two weeks.

3.2 Contractor invoices Owner no more than once every two weeks. Payment is due within fifteen (15) days of receipt by Owner. Undisputed amounts not paid within fifteen (15) days accrue interest at the maximum rate permitted by Georgia law. Owner may withhold only the portion of an invoice reasonably disputed in writing and shall pay all undisputed amounts on time.

3.3 Stop-work for nonpayment. If Owner fails to pay an undisputed amount within fifteen (15) days after it is due, Contractor may suspend the Work on written notice until paid, and shall receive an equitable extension of time and reimbursement of reasonable demobilization and remobilization costs.

3.4 Final payment is due on issuance of a Certificate of Occupancy or final inspection approval, completion of punch-list items, and delivery of the final lien waiver and warranty documentation.`;

const NO_RETAINAGE = `3.5 No retainage. Owner shall not withhold retainage from any progress draw. Any retainage requirement must be stated expressly in this Agreement to apply.`;

const MULTIFAMILY_RETAINAGE = `3.5 Retainage. No retainage is withheld unless an amount is expressly stated in this Agreement, and any stated retainage (a) shall not exceed five percent (5%) of each draw, (b) is not withheld on general conditions, insurance, or Contractor's fee, and (c) is released for each building at Substantial Completion of that building.`;

const CHANGE_ORDERS = `## 5. Change Orders and Concealed Conditions

5.1 Any change to the Work, Contract Price, or schedule must be in a written Change Order signed by both Parties before the affected Work proceeds, except in an emergency affecting safety. Verbal change requests are not binding.

5.2 Concealed or unforeseen conditions. If subsurface, demolition, or other concealed conditions differ materially from what is shown or reasonably expected (for example soil, rock, water, buried debris, or conditions left by prior demolition), Contractor is entitled to a Change Order adjusting price and time. Contractor bears no risk for conditions it could not reasonably have anticipated.

5.3 Hazardous materials. Asbestos, lead, mold, and other hazardous materials are excluded from the Work. If encountered, Contractor may stop affected Work until the Owner has the material remediated by a qualified party, with an equitable Change Order for price and time.

5.4 Materials escalation. If the price of a major material input (including lumber, concrete, steel, roofing, or mechanical equipment) increases by more than five percent (5%) between the Effective Date and the date Contractor purchases it in the ordinary sequence of the Work, Contractor is entitled to a Change Order for the documented increase. Contractor shall give notice of the increase and use commercially reasonable efforts to mitigate it before purchasing.`;

const OWNER_RESPONSIBILITIES = `## 6. Owner Responsibilities

6.1 Owner shall make decisions, selections, and approvals within seven (7) days of Contractor's written request, provide Contractor unimpeded access to the Property, and keep water and electric utility service available for construction use, or bear the delay under Section 4.3.

6.2 Owner shall communicate direction only through Contractor and shall not direct, engage, or pay Contractor's subcontractors or suppliers directly for any part of the Work.

6.3 Owner-furnished items and design. Materials, plans, and information Owner furnishes must arrive when the construction schedule requires them, and Owner bears responsibility for their fitness, accuracy, and code compliance as provided in Section 1.2.`;

const INSURANCE = `## 7. Insurance

7.1 Contractor shall maintain commercial general liability insurance, workers' compensation as required by Georgia law, and builder's risk coverage on the Work until Substantial Completion, each in commercially reasonable amounts, and shall furnish certificates on request.

7.2 From Substantial Completion, Owner shall carry property insurance on the residence. The Parties waive all rights against each other for damages covered by property or builder's risk insurance to the extent of the proceeds received, and shall obtain any endorsement needed to give effect to this waiver of subrogation.`;

const LIMITATION = `## 8. Limitation of Liability

8.1 Neither Party is liable to the other for indirect, incidental, consequential, or punitive damages. Contractor's total liability under this Agreement shall not exceed the Contract Price actually paid to Contractor.`;

const INDEMNIFICATION = `## 9. Indemnification

9.1 To the fullest extent permitted by law and as limited by O.C.G.A. § 13-8-2(b), each Party shall indemnify the other from third-party claims for bodily injury or property damage to the extent caused by the indemnifying Party's own negligence. Neither Party indemnifies the other for the other's negligence.`;

const WARRANTY_CORE = `10.1 Contractor warrants the Work will be free from defects in materials and workmanship for one (1) year from Substantial Completion, evaluated against the NAHB Residential Construction Performance Guidelines, and provides the written warranty required for new homes under Georgia State Licensing Board rules. Manufacturer and supplier warranties on appliances, systems, and materials are assigned to Owner and limited to their respective terms.

10.2 The warranty excludes defects from normal wear, Owner misuse, deferred maintenance, alterations by others, Owner-furnished materials or design, and acts of God.

10.3 Claim procedure. Owner gives written notice of a warranty claim within the warranty period and allows Contractor reasonable access during business hours to inspect and repair. Repair or replacement of the defective Work is the exclusive warranty remedy; Contractor is not responsible for work performed on the claimed defect by others without Contractor's prior written consent.`;

const RIGHT_TO_REPAIR = `## 11. Georgia Right to Repair Act Notice

NOTICE (O.C.G.A. § 8-2-35 ET SEQ.): GEORGIA LAW CONTAINS IMPORTANT REQUIREMENTS YOU MUST FOLLOW BEFORE YOU MAY FILE A LAWSUIT OR OTHER ACTION FOR DEFECTIVE CONSTRUCTION. AT LEAST NINETY (90) DAYS BEFORE FILING, YOU MUST SERVE ON THE CONTRACTOR A WRITTEN NOTICE OF THE CONSTRUCTION CONDITIONS YOU ALLEGE ARE DEFECTIVE AND GIVE THE CONTRACTOR AN OPPORTUNITY TO REPAIR OR PAY FOR THE DEFECTS. YOU ARE NOT OBLIGATED TO ACCEPT ANY OFFER. THERE ARE STRICT DEADLINES AND PROCEDURES UNDER STATE LAW.

11.1 The Parties shall follow the notice-and-opportunity-to-repair process of the Georgia Right to Repair Act, O.C.G.A. § 8-2-35 et seq., before any litigation over an alleged defect, to the extent the Act applies.`;

const LIEN_WAIVERS = `## 12. Lien Waivers

12.1 In connection with each payment, Contractor furnishes a lien waiver limited to the amount actually paid, in the interim or final statutory form required by O.C.G.A. § 44-14-366 as applicable; the final-payment form is attached as Exhibit B. A waiver is limited to lien and bond rights and does not waive Contractor's other rights to payment under this Agreement. If a payment underlying a delivered waiver is not received, Contractor shall file an Affidavit of Nonpayment within the statutory ninety (90) day period to preserve its lien.`;

const TERMINATION = `## 13. Termination

13.1 For cause. If a Party materially breaches and fails to cure within fourteen (14) days after written notice (ten (10) days for nonpayment), the other Party may terminate this Agreement and pursue its remedies under this Agreement and Georgia law.

13.2 Owner termination for convenience. Owner may terminate for convenience on seven (7) days' written notice. On such termination Owner shall pay Contractor for all Work performed, materials ordered that cannot reasonably be returned, reasonable demobilization costs, and overhead and profit on the Work performed to the date of termination.

13.3 On any termination, amounts owed are due within fifteen (15) days of Contractor's final accounting, and Sections 8 through 12 and 14 survive.`;

const DISPUTES = `## 14. Dispute Resolution

14.1 The Parties shall first attempt good-faith negotiation, then non-binding mediation in {{county}} County, Georgia. Any unresolved dispute is decided in the state or superior courts of {{county}} County, Georgia, the exclusive venue. The prevailing Party may recover reasonable attorney's fees as permitted by law.`;

const GENERAL = `## 15. General

15.1 Georgia law governs. This Agreement and its exhibits are the entire agreement and supersede prior discussions; amendments must be written and signed by both Parties. If any provision is unenforceable, the rest remains in effect. Notices are in writing, delivered by hand, certified mail, or statutory overnight delivery to the addresses the Parties designate in writing. This Agreement may be signed in counterparts and by electronic signature under the Georgia Uniform Electronic Transactions Act, O.C.G.A. § 10-12-1 et seq.`;

const SIGNATURES = `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

**CONTRACTOR** — 8th Street Construction LLC

By: {{contractor_signatory}}

Date: ____________________

**OWNER** — {{owner_name}}

By: {{owner_signatory}}

Date: ____________________`;

const EXHIBIT_B = `## Exhibit B — Lien Waiver (final payment form)

This is the lien waiver Contractor provides in connection with final payment, in the form required by O.C.G.A. § 44-14-366. Project information is completed; the payment amount, date, and signatures are filled in at the time of execution. Interim payments use the statutory interim waiver form with the same project information.

WAIVER AND RELEASE OF LIEN AND PAYMENT BOND RIGHTS UPON FINAL PAYMENT

STATE OF GEORGIA, COUNTY OF {{county}}

THE UNDERSIGNED MECHANIC AND/OR MATERIALMAN HAS BEEN EMPLOYED BY 8TH STREET CONSTRUCTION LLC (NAME OF CONTRACTOR) TO FURNISH ALL LABOR, MATERIALS, AND SERVICES (DESCRIBE MATERIALS AND/OR LABOR) FOR THE CONSTRUCTION OF IMPROVEMENTS KNOWN AS THE {{project_name}} (TITLE OF THE PROJECT OR BUILDING) WHICH IS LOCATED IN THE COUNTY OF {{county}}, AND IS OWNED BY {{owner_name}} (NAME OF OWNER) AND MORE PARTICULARLY DESCRIBED AS FOLLOWS: {{property_address}} (STREET ADDRESS OF THE PROJECT). UPON THE RECEIPT OF THE SUM OF $______________, THE MECHANIC AND/OR MATERIALMAN WAIVES AND RELEASES ANY AND ALL LIENS OR CLAIMS OF LIENS IT HAS UPON THE FOREGOING DESCRIBED PROPERTY OR ANY RIGHTS AGAINST ANY LABOR AND/OR MATERIAL BOND ON ACCOUNT OF LABOR OR MATERIALS, OR BOTH, FURNISHED BY THE UNDERSIGNED TO OR ON ACCOUNT OF SAID CONTRACTOR FOR SAID PROPERTY.

GIVEN UNDER HAND AND SEAL THIS ______ DAY OF ______________, 20____.

________________________________ (SEAL) CLAIMANT — 8TH STREET CONSTRUCTION LLC

________________________________ (WITNESS)

________________________________ (ADDRESS)

NOTICE: WHEN YOU EXECUTE AND SUBMIT THIS DOCUMENT, YOU SHALL BE CONCLUSIVELY DEEMED TO HAVE WAIVED AND RELEASED ANY AND ALL LIENS AND CLAIMS OF LIENS UPON THE FOREGOING DESCRIBED PROPERTY AND ANY RIGHTS REGARDING ANY LABOR OR MATERIAL BOND REGARDING THE SAID PROPERTY TO THE EXTENT (AND ONLY TO THE EXTENT) SET FORTH ABOVE, EVEN IF YOU HAVE NOT ACTUALLY RECEIVED SUCH PAYMENT, 90 DAYS AFTER THE DATE STATED ABOVE UNLESS YOU FILE AN AFFIDAVIT OF NONPAYMENT PRIOR TO THE EXPIRATION OF SUCH 90 DAY PERIOD. THE FAILURE TO INCLUDE THIS NOTICE LANGUAGE ON THE FORM SHALL RENDER THE FORM UNENFORCEABLE AND INVALID AS A WAIVER AND RELEASE UNDER O.C.G.A. § 44-14-366.`;

/* =====================================================================
 * Single-family standard (the 608 Macon terms, generalized and hardened)
 * ===================================================================== */

export const SINGLE_FAMILY_BODY = `# Residential Construction Agreement

Fixed-Price Build · Single-Family Residence

**Project** {{property_address}}

**Owner** {{owner_name}}

**Contractor** 8th Street Construction LLC

**Contract Price** {{contract_price}} ({{contract_price_words}})

**Effective Date** {{effective_date}}

---

${PREAMBLE}

## 1. Scope of Work

1.1 Contractor shall furnish the labor, materials, equipment, and supervision to construct and deliver the residence described in Exhibit A (the "Work"), in a good and workmanlike manner and in compliance with the 2024 International Residential Code as amended by Georgia and applicable local codes.

1.2 Contractor builds from the plans and information Owner provides (Exhibit A). Contractor is not responsible for errors, omissions, or code deficiencies in the Owner-furnished design; correcting a design defect discovered during construction is a Change Order under Section 5.

1.3 Specialty work — electrical, plumbing, conditioned-air (HVAC), low-voltage, and utility — shall be performed by subcontractors holding the applicable Georgia license under O.C.G.A. § 43-14.

## 2. Contract Price

2.1 The fixed Contract Price is {{contract_price}}, subject to additions and deductions by Change Order. It includes sales and use taxes, and excludes only items expressly identified as excluded or Owner-furnished.

${PAYMENT}

${NO_RETAINAGE}

## 4. Time and Completion

4.1 Contractor commences within fourteen (14) days after the later of the Effective Date or issuance of the building permit, and pursues the Work to Substantial Completion with reasonable diligence.

4.2 "Substantial Completion" means the residence is sufficiently complete for Owner to occupy it for its intended use, evidenced by a Certificate of Occupancy or final inspection approval.

4.3 Excusable delay. Contractor's time is extended, without penalty, for any delay beyond its reasonable control — weather, acts of God, labor or material shortages or price surges, concealed or unforeseen conditions, Owner-directed changes, or delayed Owner decisions, selections, or payments.

${CHANGE_ORDERS}

${OWNER_RESPONSIBILITIES}

${INSURANCE}

${LIMITATION}

${INDEMNIFICATION}

## 10. Warranty

${WARRANTY_CORE}

${RIGHT_TO_REPAIR}

${LIEN_WAIVERS}

${TERMINATION}

${DISPUTES}

${GENERAL}

---

${SIGNATURES}

---

## Exhibit A — Scope of Work and Plans

New single-family residence at {{property_address}}, constructed per {{plans_description}}, which plans are incorporated by reference.

{{scope_description}}

---

${EXHIBIT_B}`;

/* =====================================================================
 * Multifamily standard. Same skeleton; IBC-family code reference,
 * phased per-building completion, retainage addressed expressly.
 * ===================================================================== */

export const MULTIFAMILY_BODY = `# Residential Construction Agreement

Fixed-Price Build · Multifamily Residential

**Project** {{property_address}}

**Owner** {{owner_name}}

**Contractor** 8th Street Construction LLC

**Contract Price** {{contract_price}} ({{contract_price_words}})

**Effective Date** {{effective_date}}

---

${PREAMBLE}

## 1. Scope of Work

1.1 Contractor shall furnish the labor, materials, equipment, and supervision to construct and deliver the multifamily residential improvements described in Exhibit A (the "Work"), in a good and workmanlike manner and in compliance with the Georgia State Minimum Standard Codes, including the International Building Code and International Residential Code as applicable to the structures, each as amended by Georgia and applicable local codes.

1.2 Contractor builds from the plans and information Owner provides (Exhibit A). Contractor is not responsible for errors, omissions, or code deficiencies in the Owner-furnished design; correcting a design defect discovered during construction is a Change Order under Section 5.

1.3 Specialty work — electrical, plumbing, conditioned-air (HVAC), low-voltage, fire protection, and utility — shall be performed by subcontractors holding the applicable Georgia license under O.C.G.A. § 43-14.

## 2. Contract Price

2.1 The fixed Contract Price is {{contract_price}}, subject to additions and deductions by Change Order. It includes sales and use taxes, and excludes only items expressly identified as excluded or Owner-furnished.

${PAYMENT}

${MULTIFAMILY_RETAINAGE}

## 4. Time and Completion

4.1 Contractor commences within fourteen (14) days after the later of the Effective Date or issuance of the building permit, and pursues the Work to Substantial Completion with reasonable diligence.

4.2 "Substantial Completion" means a building (or the project, where the Work is a single building) is sufficiently complete for Owner to occupy or use it for its intended purpose, evidenced by a Certificate of Occupancy or final inspection approval. Where the Work comprises more than one building, Substantial Completion occurs building by building, and each building's warranty period, insurance transition, and retainage release run from its own Substantial Completion.

4.3 Excusable delay. Contractor's time is extended, without penalty, for any delay beyond its reasonable control — weather, acts of God, labor or material shortages or price surges, concealed or unforeseen conditions, Owner-directed changes, or delayed Owner decisions, selections, or payments.

${CHANGE_ORDERS}

${OWNER_RESPONSIBILITIES}

${INSURANCE}

${LIMITATION}

${INDEMNIFICATION}

## 10. Warranty

${WARRANTY_CORE}

${RIGHT_TO_REPAIR}

${LIEN_WAIVERS}

${TERMINATION}

${DISPUTES}

${GENERAL}

---

${SIGNATURES}

---

## Exhibit A — Scope of Work and Plans

Multifamily residential construction at {{property_address}}, constructed per {{plans_description}}, which plans are incorporated by reference.

{{scope_description}}

---

${EXHIBIT_B}`;

export const STANDARD_TEMPLATES = [
  {
    name: "Single-family fixed price (company standard)",
    project_type: "single_family" as const,
    body_md: SINGLE_FAMILY_BODY,
    notes:
      "Generalized from the signed 608 Macon agreement (July 2026). Added when it became the standard: express no-retainage (3.5), materials escalation (5.4), Owner Responsibilities (6), waiver of subrogation (7.2), warranty claim procedure (10.3), interim lien waiver reference (12.1), and Termination incl. owner convenience (13). Have a Georgia construction attorney review before first use on a new counterparty type.",
  },
  {
    name: "Multifamily fixed price",
    project_type: "multifamily" as const,
    body_md: MULTIFAMILY_BODY,
    notes:
      "Single-family standard adapted for multifamily: Georgia State Minimum Standard Codes / IBC reference (1.1), fire protection added to licensed trades (1.3), per-building Substantial Completion with per-building warranty and retainage release (4.2), and an express retainage cap in place of the no-retainage clause (3.5). Unreviewed by counsel; attorney review strongly recommended before first multifamily signing.",
  },
];
