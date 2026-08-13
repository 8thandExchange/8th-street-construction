"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { proposalEmail } from "@/lib/email/templates/proposal";

/**
 * Customer-facing proposals built from the estimate. The record is the
 * point: what was offered, for how much, when it went out, and how the
 * answer came back. Online click-to-accept (or a real e-sign vendor) can
 * layer on later; until then acceptance is recorded here with a note
 * saying how it arrived (signed PDF, email, Habitat board minute).
 */

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const v = str(formData, key);
  return v || null;
}

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/proposals`);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function createProposal(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  const scope = str(formData, "scope_md");
  const amount = Number(str(formData, "amount").replace(/[$,\s]/g, ""));

  if (!title || !scope) throw new Error("A proposal needs a title and a written scope");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Give the proposal a price");

  const { data: last } = await supabase
    .from("project_proposals")
    .select("number")
    .eq("project_id", projectId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_proposals").insert({
    project_id: projectId,
    number: (last?.number ?? 0) + 1,
    title,
    scope_md: scope,
    terms_md: optional(formData, "terms_md"),
    amount,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

/** Email the proposal to the project's client and mark it sent. */
export async function sendProposal(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");

  const { data: proposal } = await supabase
    .from("project_proposals")
    .select("*")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!proposal) throw new Error("Proposal not found");
  if (!["draft", "sent"].includes(proposal.status))
    throw new Error("Only a draft can be sent");

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("title, client_id")
    .eq("id", projectId)
    .single();
  if (!project?.client_id) throw new Error("This project has no client on file yet");

  const { data: client } = await admin
    .from("profiles")
    .select("email, first_name")
    .eq("id", project.client_id)
    .single();
  if (!client?.email) throw new Error("The client has no email address on file");

  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email isn't configured (RESEND_API_KEY missing)");

  const from =
    process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";
  const { subject, html, text } = proposalEmail({
    firstName: client.first_name || "there",
    projectTitle: project.title,
    proposal,
  });

  const { error: sendErr } = await new Resend(key).emails.send({
    from,
    to: [client.email],
    subject,
    html,
    text,
  });
  if (sendErr) throw new Error(`The email didn't send: ${sendErr.message}`);

  const { error } = await supabase
    .from("project_proposals")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidate(projectId);
  return { sent_to: client.email };
}

/** Record how the client answered. Accepting sets the project contract. */
export async function setProposalStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["accepted", "declined", "withdrawn"].includes(status))
    throw new Error("Unknown proposal outcome");

  const { data: proposal } = await supabase
    .from("project_proposals")
    .select("id, amount, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!proposal) throw new Error("Proposal not found");

  const { error } = await supabase
    .from("project_proposals")
    .update({
      status,
      responded_at: new Date().toISOString(),
      response_note: optional(formData, "response_note"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Acceptance is the moment the number becomes the contract.
  if (status === "accepted") {
    await supabase
      .from("projects")
      .update({ contract_value: Number(proposal.amount) })
      .eq("id", projectId);
  }

  revalidate(projectId);
}

export async function deleteProposal(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  // Sent proposals are records; only drafts can be deleted.
  const { error } = await supabase
    .from("project_proposals")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidate(projectId);
}
