import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  dollarsToWords,
  hasUnmergedFields,
  longDate,
  mergeContractTemplate,
  usd,
  STANDARD_SINGLE_FAMILY_PRICE,
  type ContractMergeFields,
} from "@/lib/contracts/standard-terms";

/**
 * The contracts half of the assistant's tool surface.
 *
 * The admin (Troy or Robby) gives direction — "draft the agreement for
 * Merry Street", "what's still missing on that contract", "mark it
 * signed" — and the assistant works the same records the Contracts page
 * does. Drafting and filling placeholders are reversible and run without
 * a gate; a status change is the record (signing sets the job's contract
 * value), so it rides the approval card.
 */

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  out_for_signature: "Out for signature",
  signed: "Signed",
  void: "Void",
};

export const CONTRACT_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_contracts",
    description:
      "Every agreement across every job: status (draft / out for signature / signed / void), owner, price, effective date, and whether the text still has unfilled placeholders. Also lists the signed contract PDFs on record. Use for 'where are our contracts', 'is Merry Street signed yet', or before drafting so you don't duplicate one.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Limit to one job (optional)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_contract",
    description:
      "One agreement in full: tracked fields, status history note, linked signed PDF, the full agreement text, and which {{placeholders}} are still unfilled. Call before answering questions about an agreement's terms or editing it.",
    input_schema: {
      type: "object",
      properties: {
        contract_id: { type: "string", description: "Agreement UUID from list_contracts" },
      },
      required: ["contract_id"],
      additionalProperties: false,
    },
  },
  {
    name: "draft_contract",
    description:
      "Draft a per-job agreement from the company standard. Merges the job specifics into the standard text (price appears in figures and written-out words automatically). Fields left out stay as visible {{placeholders}} to fill later. Creates a DRAFT — reversible, deletable, nothing is sent. The single-family standard price is $239,665 and is the default when contract_price is omitted.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Job UUID from list_projects" },
        template_type: {
          type: "string",
          enum: ["single_family", "multifamily"],
          description: "Which company standard to draft from",
        },
        owner_name: {
          type: "string",
          description:
            "Counterparty's legal name, e.g. 'Habitat for Humanity — CSRA, Inc.'",
        },
        owner_entity_description: {
          type: "string",
          description: "e.g. 'a Georgia nonprofit corporation'",
        },
        property_address: {
          type: "string",
          description:
            "Full legal address with county and zip, e.g. '608 Macon Avenue, Augusta, Richmond County, Georgia 30901'",
        },
        county: { type: "string", description: "Georgia county (default Richmond)" },
        contract_price: {
          type: "number",
          description: "Dollars. Omit to use the single-family standard $239,665",
        },
        effective_date: {
          type: "string",
          description: "YYYY-MM-DD. Omit if not yet known — stays a placeholder",
        },
        plans_description: {
          type: "string",
          description:
            "e.g. 'the Booker + Vick Architects permit set, Job No. 2615, dated May 21, 2026'. Omit if plans aren't final",
        },
        scope_description: {
          type: "string",
          description: "Exhibit A paragraph. Omit to use the standard scope paragraph",
        },
        owner_signatory: { type: "string", description: "e.g. 'Bernadette Kelliher, CEO'" },
      },
      required: ["project_id", "template_type", "owner_name"],
      additionalProperties: false,
    },
  },
  {
    name: "fill_contract_placeholders",
    description:
      "Fill the remaining {{placeholders}} on a DRAFT agreement: the effective date and/or the plans description. Reports which placeholders remain afterwards. For any other text change, point the admin to the agreement's page.",
    input_schema: {
      type: "object",
      properties: {
        contract_id: { type: "string" },
        effective_date: { type: "string", description: "YYYY-MM-DD" },
        plans_description: { type: "string" },
      },
      required: ["contract_id"],
      additionalProperties: false,
    },
  },
  {
    name: "set_contract_status",
    description:
      "Move an agreement through its life: draft → out_for_signature → signed, or void. Marking it signed is the record — it sets the job's contract value to the agreement price and can link the countersigned PDF (signed_document_id from list_contracts' signed files). Gated behind the approval card.",
    input_schema: {
      type: "object",
      properties: {
        contract_id: { type: "string" },
        status: {
          type: "string",
          enum: ["draft", "out_for_signature", "signed", "void"],
        },
        status_note: {
          type: "string",
          description: "How it was signed or why it was voided, e.g. 'Signed via BoldSign 08/21/2026'",
        },
        signed_document_id: {
          type: "string",
          description: "UUID of the signed PDF document row to link (optional)",
        },
      },
      required: ["contract_id", "status"],
      additionalProperties: false,
    },
  },
];

export const CONTRACT_TOOL_NAMES = new Set(CONTRACT_TOOLS.map((t) => t.name));

export function contractToolRequiresConfirmation(name: string): boolean {
  return name === "set_contract_status";
}

export async function describeContractConfirmation(
  name: string,
  input: unknown
): Promise<string | null> {
  if (name !== "set_contract_status") return null;
  const i = input as Record<string, unknown>;
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("project_contracts")
    .select("number, title, owner_name, contract_price, status, project:projects(title)")
    .eq("id", String(i.contract_id ?? ""))
    .single();
  const status = String(i.status ?? "");
  if (!c) return `Set an agreement's status to ${STATUS_LABELS[status] ?? status}.`;
  const project = Array.isArray(c.project) ? c.project[0] : c.project;
  const head = `${project?.title ?? "this job"} · Agreement #${c.number} — "${c.title}" with ${c.owner_name} for ${usd(Number(c.contract_price))}`;
  if (status === "signed") {
    return `Mark this agreement SIGNED — this is the record, and it sets the job's contract value to ${usd(Number(c.contract_price))}:\n\n${head}${i.signed_document_id ? "\n\nThe countersigned PDF will be linked to it." : ""}`;
  }
  if (status === "void") {
    return `VOID this agreement — it stops being an active record:\n\n${head}`;
  }
  return `Move this agreement to ${STATUS_LABELS[status] ?? status}:\n\n${head}`;
}

const STANDARD_SCOPE_DESCRIPTION =
  "The Work includes the full scope of construction shown in the plans: site preparation and erosion control; foundation; framing and dry-in; roofing; windows and exterior doors; siding; plumbing, electrical, and HVAC by licensed subcontractors; insulation and drywall; interior trim, cabinets, and countertops; flooring; paint; appliances; gutters; walkway; and final cleaning.";

function listUnfilled(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

export async function executeContractTool(name: string, input: unknown): Promise<unknown> {
  const admin = createAdminClient();
  const i = input as Record<string, unknown>;

  switch (name) {
    case "list_contracts": {
      let agreementsQuery = admin
        .from("project_contracts")
        .select(
          "id, project_id, number, title, owner_name, contract_price, effective_date, status, status_note, body_md, signed_document_id, project:projects(title)"
        )
        .order("created_at", { ascending: false });
      let filesQuery = admin
        .from("project_documents")
        .select("id, project_id, title, created_at, project:projects(title)")
        .eq("category", "contract")
        .order("created_at", { ascending: false });
      if (i.project_id) {
        agreementsQuery = agreementsQuery.eq("project_id", String(i.project_id));
        filesQuery = filesQuery.eq("project_id", String(i.project_id));
      }
      const [{ data: agreements, error }, { data: files }] = await Promise.all([
        agreementsQuery,
        filesQuery,
      ]);
      if (error) return { error: error.message };
      return {
        agreements: (agreements ?? []).map((c) => {
          const project = Array.isArray(c.project) ? c.project[0] : c.project;
          return {
            id: c.id,
            project_id: c.project_id,
            project: project?.title ?? null,
            number: c.number,
            title: c.title,
            owner: c.owner_name,
            price: Number(c.contract_price),
            effective_date: c.effective_date,
            status: c.status,
            status_note: c.status_note,
            signed_document_id: c.signed_document_id,
            unfilled_placeholders: listUnfilled(c.body_md),
          };
        }),
        signed_files: (files ?? []).map((f) => {
          const project = Array.isArray(f.project) ? f.project[0] : f.project;
          return {
            id: f.id,
            project_id: f.project_id,
            project: project?.title ?? null,
            title: f.title,
            added: f.created_at,
          };
        }),
      };
    }

    case "get_contract": {
      const { data: c, error } = await admin
        .from("project_contracts")
        .select("*, project:projects(title, street_address)")
        .eq("id", String(i.contract_id ?? ""))
        .single();
      if (error || !c) return { error: error?.message ?? "Agreement not found" };
      const project = Array.isArray(c.project) ? c.project[0] : c.project;
      return {
        id: c.id,
        project: project?.title ?? null,
        number: c.number,
        title: c.title,
        owner: c.owner_name,
        price: Number(c.contract_price),
        effective_date: c.effective_date,
        status: c.status,
        status_note: c.status_note,
        signed_document_id: c.signed_document_id,
        unfilled_placeholders: listUnfilled(c.body_md),
        admin_url: `/admin/contracts/${c.id}`,
        body_md: c.body_md,
      };
    }

    case "draft_contract": {
      const projectId = String(i.project_id ?? "");
      const templateType = String(i.template_type ?? "single_family");
      const ownerName = String(i.owner_name ?? "").trim();
      if (!projectId || !ownerName) return { error: "project_id and owner_name are required" };

      const priceRaw =
        i.contract_price != null ? Number(i.contract_price) : STANDARD_SINGLE_FAMILY_PRICE;
      if (!Number.isFinite(priceRaw) || priceRaw <= 0)
        return { error: "contract_price must be a positive dollar amount" };

      const [{ data: template }, { data: project }] = await Promise.all([
        admin
          .from("contract_templates")
          .select("id, name, body_md")
          .eq("project_type", templateType)
          .single(),
        admin.from("projects").select("id, title").eq("id", projectId).single(),
      ]);
      if (!template) return { error: `No ${templateType} standard template found` };
      if (!project) return { error: "Project not found" };

      const effectiveDate = String(i.effective_date ?? "").trim();
      const fields: ContractMergeFields = {
        owner_name: ownerName,
        owner_entity_description: String(i.owner_entity_description ?? "").trim(),
        property_address: String(i.property_address ?? "").trim(),
        county: String(i.county ?? "").trim() || "Richmond",
        project_name: `${project.title} Residence`,
        contract_price: usd(priceRaw),
        contract_price_words: dollarsToWords(priceRaw),
        effective_date: effectiveDate ? longDate(effectiveDate) : "",
        plans_description: String(i.plans_description ?? "").trim(),
        scope_description:
          String(i.scope_description ?? "").trim() || STANDARD_SCOPE_DESCRIPTION,
        owner_signatory: String(i.owner_signatory ?? "").trim(),
        contractor_signatory: "Troy W. Akers, Managing Principal",
      };

      const { data: last } = await admin
        .from("project_contracts")
        .select("number")
        .eq("project_id", projectId)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const body = mergeContractTemplate(template.body_md, fields);
      const { data: created, error } = await admin
        .from("project_contracts")
        .insert({
          project_id: projectId,
          number: (last?.number ?? 0) + 1,
          template_id: template.id,
          title: "Residential Construction Agreement",
          owner_name: ownerName,
          contract_price: priceRaw,
          effective_date: effectiveDate || null,
          body_md: body,
        })
        .select("id, number")
        .single();
      if (error) return { error: error.message };

      return {
        ok: true,
        contract_id: created.id,
        number: created.number,
        project: project.title,
        price: priceRaw,
        price_words: fields.contract_price_words,
        status: "draft",
        unfilled_placeholders: listUnfilled(body),
        admin_url: `/admin/contracts/${created.id}`,
      };
    }

    case "fill_contract_placeholders": {
      const { data: c, error } = await admin
        .from("project_contracts")
        .select("id, status, body_md, effective_date")
        .eq("id", String(i.contract_id ?? ""))
        .single();
      if (error || !c) return { error: error?.message ?? "Agreement not found" };
      if (c.status !== "draft")
        return { error: `Only drafts can be edited here — this agreement is ${c.status}` };

      let body: string = c.body_md;
      const updates: Record<string, unknown> = {};
      const effectiveDate = String(i.effective_date ?? "").trim();
      if (effectiveDate) {
        if (!body.includes("{{effective_date}}"))
          return {
            error:
              "The effective date is already written into the text. Change it on the agreement's page so the wording stays consistent.",
          };
        body = body.split("{{effective_date}}").join(longDate(effectiveDate));
        updates.effective_date = effectiveDate;
      }
      const plans = String(i.plans_description ?? "").trim();
      if (plans) {
        if (!body.includes("{{plans_description}}"))
          return {
            error:
              "The plans description is already written into the text. Change it on the agreement's page.",
          };
        body = body.split("{{plans_description}}").join(plans);
      }
      if (!effectiveDate && !plans)
        return { error: "Nothing to fill — pass effective_date and/or plans_description" };

      updates.body_md = body;
      const { error: upErr } = await admin
        .from("project_contracts")
        .update(updates)
        .eq("id", c.id);
      if (upErr) return { error: upErr.message };

      return {
        ok: true,
        unfilled_placeholders: listUnfilled(body),
        ready_for_signature: !hasUnmergedFields(body),
      };
    }

    case "set_contract_status": {
      const status = String(i.status ?? "");
      if (!["draft", "out_for_signature", "signed", "void"].includes(status))
        return { error: "Unknown status" };
      const { data: c, error } = await admin
        .from("project_contracts")
        .select("id, project_id, contract_price, status, body_md")
        .eq("id", String(i.contract_id ?? ""))
        .single();
      if (error || !c) return { error: error?.message ?? "Agreement not found" };
      if (c.status === "signed" && status !== "void")
        return { error: "A signed agreement only moves to void" };
      if (status === "signed" && hasUnmergedFields(c.body_md))
        return {
          error: `This agreement still has unfilled placeholders (${listUnfilled(c.body_md).join(", ")}). Fill them before marking it signed.`,
        };

      const signedDocumentId = String(i.signed_document_id ?? "").trim();
      const { error: upErr } = await admin
        .from("project_contracts")
        .update({
          status,
          status_note: String(i.status_note ?? "").trim() || null,
          ...(signedDocumentId ? { signed_document_id: signedDocumentId } : {}),
        })
        .eq("id", c.id);
      if (upErr) return { error: upErr.message };

      if (status === "signed") {
        await admin
          .from("projects")
          .update({ contract_value: Number(c.contract_price) })
          .eq("id", c.project_id);
      }

      return {
        ok: true,
        status,
        contract_value_updated: status === "signed" ? Number(c.contract_price) : undefined,
      };
    }

    default:
      return { error: `Unknown contract tool: ${name}` };
  }
}
