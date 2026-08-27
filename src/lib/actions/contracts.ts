"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendAdminSms } from "@/lib/sms/ghl";
import { sendPushToAdmins } from "@/lib/notify/push";
import { trackWorkflowEvent } from "@/lib/analytics/track";
import {
  dollarsToWords,
  hasUnmergedFields,
  longDate,
  mergeContractTemplate,
  usd,
  type ContractMergeFields,
} from "@/lib/contracts/standard-terms";
import {
  ownerDisplayName,
  propertyAddressLine,
  scopeMdToContractParagraph,
  todayIsoDate,
} from "@/lib/procurement/proposal-contract";

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
  if (projectId) {
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/proposals`);
    revalidatePath(`/client/projects/${projectId}`);
    revalidatePath(`/client/projects/${projectId}/contracts`);
    revalidatePath(`/client/projects/${projectId}/proposals`);
  }
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

/**
 * Draft the standard agreement from an accepted proposal. Price, scope,
 * owner, and address come from stored records — never from the browser.
 */
export async function createContractFromAcceptedProposal(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const proposalId = str(formData, "proposal_id");
  const projectId = str(formData, "project_id");
  if (!proposalId || !projectId) throw new Error("Pick a proposal");

  const { data: proposal } = await supabase
    .from("project_proposals")
    .select("id, project_id, title, scope_md, terms_md, amount, status")
    .eq("id", proposalId)
    .eq("project_id", projectId)
    .single();
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "accepted") {
    throw new Error("Draft an agreement only from an accepted proposal");
  }

  const { data: existing } = await supabase
    .from("project_contracts")
    .select("id")
    .eq("source_proposal_id", proposalId)
    .maybeSingle();
  if (existing) return { id: existing.id };

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, street_address, location, client_id")
    .eq("id", projectId)
    .single();
  if (!project) throw new Error("Project not found");

  const [{ data: client }, { data: templates }] = await Promise.all([
    project.client_id
      ? supabase
          .from("profiles")
          .select("first_name, last_name, organization_name, company")
          .eq("id", project.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("contract_templates")
      .select("id, name, project_type, body_md")
      .order("project_type"),
  ]);

  const templateId = str(formData, "template_id") || templates?.[0]?.id;
  const template = templates?.find((t) => t.id === templateId) ?? templates?.[0];
  if (!template) throw new Error("Add a contract template first");

  const ownerName = ownerDisplayName(client);
  const priceRaw = Number(proposal.amount);
  const effectiveDate = todayIsoDate();
  const fields: ContractMergeFields = {
    owner_name: ownerName,
    owner_entity_description: "",
    property_address: propertyAddressLine(project),
    county: "Richmond",
    project_name: `${project.title} Residence`,
    contract_price: usd(priceRaw),
    contract_price_words: dollarsToWords(priceRaw),
    effective_date: longDate(effectiveDate),
    plans_description: "",
    scope_description: scopeMdToContractParagraph(proposal.scope_md, proposal.terms_md),
    owner_signatory: "",
    contractor_signatory: "Troy W. Akers, Managing Principal",
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
      template_id: template.id,
      title: proposal.title,
      owner_name: ownerName,
      contract_price: priceRaw,
      effective_date: effectiveDate,
      body_md: mergeContractTemplate(template.body_md, fields),
      source_proposal_id: proposal.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await trackWorkflowEvent({
    workflow: "contract",
    event: "start",
    entityId: created.id,
    projectId,
  });
  revalidate(projectId);
  return { id: created.id };
}

/** Client types their legal name to sign an agreement sent for signature. */
export async function clientSignContract(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const projectId = str(formData, "project_id");
  const contractId = str(formData, "id");
  const signatureText = str(formData, "signature_text");
  if (!signatureText) return { error: "Type your full legal name to sign" };

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { error: "You do not have access to this project" };

  const { data: visible } = await supabase
    .from("project_contracts")
    .select("id, number, title, contract_price, status")
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!visible || visible.status !== "out_for_signature") {
    return { error: "This agreement is not awaiting your signature" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("project_contracts")
    .update({
      status: "signed",
      client_signature_text: signatureText,
      client_signed_at: new Date().toISOString(),
      client_signed_by: user.id,
      status_note: `Signed in the client portal as ${signatureText}`,
    })
    .eq("id", contractId)
    .eq("project_id", projectId)
    .eq("status", "out_for_signature");
  if (error) return { error: error.message };

  const { error: projectError } = await admin
    .from("projects")
    .update({ contract_value: Number(visible.contract_price) })
    .eq("id", projectId);
  if (projectError) return { error: projectError.message };

  await Promise.allSettled([
    sendAdminSms(
      `8th Street portal: agreement #${visible.number} signed on ${project.title} by ${signatureText}.`
    ),
    sendPushToAdmins({
      title: project.title,
      body: `Agreement #${visible.number} signed by ${signatureText}`,
      url: `/admin/contracts/${contractId}`,
    }),
  ]);

  await trackWorkflowEvent({
    workflow: "contract",
    event: "complete",
    entityId: contractId,
    projectId,
  });
  revalidate(projectId);
  return { ok: true };
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

  await trackWorkflowEvent({
    workflow: "contract",
    event:
      status === "signed" ? "complete" : status === "void" ? "abandon" : "start",
    entityId: id,
    projectId: contract.project_id,
  });
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

/**
 * Send a drafted agreement out for signature through BoldSign. Renders the
 * e-sign PDF (agreement text + a fixed execution page), creates the
 * BoldSign document with both signers and positioned signature/date
 * fields, and marks the agreement out_for_signature with the envelope id.
 * The webhook route completes the loop when everyone has signed.
 */
export async function sendContractForEsign(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");

  const contractorName = str(formData, "contractor_signer_name");
  const contractorEmail = str(formData, "contractor_signer_email");
  const ownerName = str(formData, "owner_signer_name");
  const ownerEmail = str(formData, "owner_signer_email");
  if (!contractorName || !contractorEmail || !ownerName || !ownerEmail)
    throw new Error("Both signers need a name and an email address");

  const { data: contract } = await supabase
    .from("project_contracts")
    .select(
      "id, project_id, number, title, status, body_md, esign_envelope_id, project:projects(id, title, street_address)"
    )
    .eq("id", id)
    .single();
  if (!contract) throw new Error("Agreement not found");
  if (contract.status !== "draft")
    throw new Error("Only a draft agreement can be sent for signature");
  if (hasUnmergedFields(contract.body_md))
    throw new Error("Fill the remaining {{placeholders}} before sending for signature");

  const project = Array.isArray(contract.project) ? contract.project[0] : contract.project;
  const shortAddress = project?.street_address || project?.title || "the Property";

  const { renderContractEsignPdf, EXECUTION_FIELDS } = await import(
    "@/lib/esign/contract-esign-pdf"
  );
  const { sendDocumentForSignature } = await import("@/lib/esign/boldsign");

  const { pdf, executionPageNumber } = await renderContractEsignPdf({
    bodyMd: contract.body_md,
    footerLabel: `${contract.title} — ${shortAddress} · 8th Street Construction LLC`,
  });

  const field = (
    fieldId: string,
    fieldType: "Signature" | "DateSigned",
    bounds: { x: number; y: number; width: number; height: number }
  ) => ({ id: fieldId, fieldType, pageNumber: executionPageNumber, bounds });

  const { documentId } = await sendDocumentForSignature({
    title: `${contract.title} — ${shortAddress}`,
    message:
      "Please review and sign the attached agreement with 8th Street Construction LLC.",
    fileName: `agreement-${contract.number}-${contract.project_id}.pdf`,
    pdf,
    signers: [
      {
        name: contractorName,
        email: contractorEmail,
        order: 1,
        fields: [
          field("contractor_signature", "Signature", EXECUTION_FIELDS.contractorSignature),
          field("contractor_date", "DateSigned", EXECUTION_FIELDS.contractorDate),
        ],
      },
      {
        name: ownerName,
        email: ownerEmail,
        order: 1,
        fields: [
          field("owner_signature", "Signature", EXECUTION_FIELDS.ownerSignature),
          field("owner_date", "DateSigned", EXECUTION_FIELDS.ownerDate),
        ],
      },
    ],
  });

  const { error } = await supabase
    .from("project_contracts")
    .update({
      status: "out_for_signature",
      esign_provider: "boldsign",
      esign_envelope_id: documentId,
      esign_sent_at: new Date().toISOString(),
      esign_status: "sent",
      status_note: `Sent via BoldSign to ${ownerName} <${ownerEmail}> and ${contractorName}`,
    })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw new Error(error.message);

  await trackWorkflowEvent({
    workflow: "contract",
    event: "start",
    entityId: id,
    projectId: contract.project_id,
  });
  revalidate(contract.project_id);
  return { ok: true, documentId };
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
