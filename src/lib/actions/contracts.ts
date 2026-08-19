"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import {
  dollarsToWords,
  longDate,
  mergeContractTemplate,
  usd,
  type ContractMergeFields,
} from "@/lib/contracts/standard-terms";

/**
 * Per-job agreements drafted from the standard templates. The template
 * is the framework; the merge fields carry the job specifics; the merged
 * body stays editable per job until it goes out for signature.
 */

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidate(projectId?: string) {
  revalidatePath("/admin/contracts");
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
}

export async function createContractFromTemplate(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const templateId = str(formData, "template_id");
  const ownerName = str(formData, "owner_name");
  const priceRaw = Number(str(formData, "contract_price").replace(/[$,\s]/g, ""));
  const effectiveDate = str(formData, "effective_date");

  if (!projectId || !templateId) throw new Error("Pick a job and a template");
  if (!ownerName) throw new Error("Name the owner (the counterparty)");
  if (!Number.isFinite(priceRaw) || priceRaw <= 0)
    throw new Error("Give the agreement a contract price");
  if (!effectiveDate) throw new Error("Set an effective date");

  const [{ data: template }, { data: project }] = await Promise.all([
    supabase.from("contract_templates").select("*").eq("id", templateId).single(),
    supabase
      .from("projects")
      .select("id, title, street_address")
      .eq("id", projectId)
      .single(),
  ]);
  if (!template) throw new Error("Template not found");
  if (!project) throw new Error("Project not found");

  const fields: ContractMergeFields = {
    owner_name: ownerName,
    owner_entity_description: str(formData, "owner_entity_description"),
    property_address: str(formData, "property_address"),
    county: str(formData, "county") || "Richmond",
    project_name: str(formData, "project_name") || `${project.title} Residence`,
    contract_price: usd(priceRaw),
    contract_price_words: dollarsToWords(priceRaw),
    effective_date: longDate(effectiveDate),
    plans_description: str(formData, "plans_description"),
    scope_description: str(formData, "scope_description"),
    owner_signatory: str(formData, "owner_signatory"),
    contractor_signatory:
      str(formData, "contractor_signatory") || "Troy W. Akers, Managing Principal",
  };

  const { data: last } = await supabase
    .from("project_contracts")
    .select("number")
    .eq("project_id", projectId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("project_contracts")
    .insert({
      project_id: projectId,
      number: (last?.number ?? 0) + 1,
      template_id: templateId,
      title: str(formData, "title") || template.name,
      owner_name: ownerName,
      contract_price: priceRaw,
      effective_date: effectiveDate,
      body_md: mergeContractTemplate(template.body_md, fields),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidate(projectId);
  return { id: created.id };
}

/** Edit the job specifics or the agreement text. Signed agreements are records. */
export async function updateContract(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");

  const { data: existing } = await supabase
    .from("project_contracts")
    .select("id, project_id, status")
    .eq("id", id)
    .single();
  if (!existing) throw new Error("Agreement not found");
  if (existing.status === "signed" || existing.status === "void")
    throw new Error("A signed or voided agreement is a record and cannot be edited");

  const price = Number(str(formData, "contract_price").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Give the agreement a contract price");

  const { error } = await supabase
    .from("project_contracts")
    .update({
      title: str(formData, "title"),
      owner_name: str(formData, "owner_name"),
      contract_price: price,
      effective_date: str(formData, "effective_date") || null,
      body_md: String(formData.get("body_md") ?? ""),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(existing.project_id);
}

/**
 * Move the agreement through its life: draft -> out_for_signature ->
 * signed, or void. Signing sets the project's contract_value, same as
 * proposal acceptance does, and can link the countersigned PDF.
 */
export async function setContractStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["draft", "out_for_signature", "signed", "void"].includes(status))
    throw new Error("Unknown agreement status");

  const { data: contract } = await supabase
    .from("project_contracts")
    .select("id, project_id, contract_price, status")
    .eq("id", id)
    .single();
  if (!contract) throw new Error("Agreement not found");
  if (contract.status === "signed" && status !== "void")
    throw new Error("A signed agreement only moves to void");

  const signedDocumentId = str(formData, "signed_document_id");
  const { error } = await supabase
    .from("project_contracts")
    .update({
      status,
      status_note: str(formData, "status_note") || null,
      ...(signedDocumentId ? { signed_document_id: signedDocumentId } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Signing is the moment the number becomes the contract.
  if (status === "signed") {
    await supabase
      .from("projects")
      .update({ contract_value: Number(contract.contract_price) })
      .eq("id", contract.project_id);
  }

  revalidate(contract.project_id);
}

export async function deleteContract(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  // Anything that went out is a record; only drafts can be deleted.
  const { error } = await supabase
    .from("project_contracts")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

/** Edit a standard template. Changes affect future drafts only. */
export async function updateContractTemplate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const body = String(formData.get("body_md") ?? "");
  if (!name || !body.trim()) throw new Error("A template needs a name and body");

  const { error } = await supabase
    .from("contract_templates")
    .update({ name, body_md: body, notes: str(formData, "notes") || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/contracts/templates");
  revalidatePath("/admin/contracts");
}
