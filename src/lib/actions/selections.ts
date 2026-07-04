"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { sendSelectionApprovedAdminEmail } from "@/lib/email/project-notify";
import { sendAdminSms } from "@/lib/sms/ghl";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/selections`);
  revalidatePath(`/client/projects/${projectId}/selections`);
}

export async function createSelection(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { error } = await supabase.from("project_selections").insert({
    project_id: projectId,
    category: String(formData.get("category") || "other"),
    title: String(formData.get("title")).trim(),
    description: String(formData.get("description") || "").trim() || null,
    allowance_amount: formData.get("allowance_amount")
      ? Number(formData.get("allowance_amount"))
      : null,
    selected_amount: formData.get("selected_amount")
      ? Number(formData.get("selected_amount"))
      : null,
    vendor: String(formData.get("vendor") || "").trim() || null,
    product_spec: String(formData.get("product_spec") || "").trim() || null,
    due_date: String(formData.get("due_date") || "").trim() || null,
    status: String(formData.get("status") || "pending"),
    client_visible: formData.get("client_visible") !== "off",
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function updateSelection(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("project_selections")
    .update({
      category: String(formData.get("category") || "other"),
      title: String(formData.get("title")).trim(),
      description: String(formData.get("description") || "").trim() || null,
      allowance_amount: formData.get("allowance_amount")
        ? Number(formData.get("allowance_amount"))
        : null,
      selected_amount: formData.get("selected_amount")
        ? Number(formData.get("selected_amount"))
        : null,
      vendor: String(formData.get("vendor") || "").trim() || null,
      product_spec: String(formData.get("product_spec") || "").trim() || null,
      due_date: String(formData.get("due_date") || "").trim() || null,
      status: String(formData.get("status") || "pending"),
      client_visible: formData.get("client_visible") === "on",
      notes: String(formData.get("notes") || "").trim() || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function deleteSelection(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  await supabase.from("project_selections").delete().eq("id", String(formData.get("id")));
  revalidate(projectId);
}

export async function clientApproveSelection(formData: FormData) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));

  const { data: sel } = await supabase
    .from("project_selections")
    .select("id, project_id, client_visible, title")
    .eq("id", id)
    .single();

  if (!sel?.client_visible) throw new Error("Unauthorized");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  if (!project || project.client_id !== user.id) throw new Error("Unauthorized");

  await supabase
    .from("project_selections")
    .update({ status: "approved" })
    .eq("id", id);

  // The builder always hears about the client's approval.
  const { data: projectMeta } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .single();
  const projectTitle = projectMeta?.title ?? "your project";
  const selectionTitle = sel.title ?? "a selection";
  await sendSelectionApprovedAdminEmail({ projectTitle, projectId, selectionTitle });
  await sendAdminSms(
    `8th Street portal: client approved selection "${selectionTitle}" on ${projectTitle}.`
  );

  revalidate(projectId);
}

export async function addSelectionOption(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const selectionId = String(formData.get("selection_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Option title is required.");

  const { count } = await supabase
    .from("selection_options")
    .select("id", { count: "exact", head: true })
    .eq("selection_id", selectionId);

  const { error } = await supabase.from("selection_options").insert({
    selection_id: selectionId,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    price: formData.get("price") ? Number(formData.get("price")) : null,
    vendor: String(formData.get("vendor") ?? "").trim() || null,
    display_order: count ?? 0,
  });
  if (error) throw new Error(error.message);

  revalidate(projectId);
}

export async function deleteSelectionOption(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const optionId = String(formData.get("option_id"));

  const { error } = await supabase.from("selection_options").delete().eq("id", optionId);
  if (error) throw new Error(error.message);

  revalidate(projectId);
}

/** Client picks one of the posted options — the real "selections" moment. */
export async function clientChooseSelectionOption(formData: FormData) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const projectId = String(formData.get("project_id"));
  const selectionId = String(formData.get("selection_id"));
  const optionId = String(formData.get("option_id"));

  const { data: sel } = await supabase
    .from("project_selections")
    .select("id, project_id, client_visible, title, status")
    .eq("id", selectionId)
    .single();
  if (!sel?.client_visible || sel.project_id !== projectId) throw new Error("Unauthorized");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, title")
    .eq("id", projectId)
    .single();
  if (!project || project.client_id !== user.id) throw new Error("Unauthorized");

  const { data: option } = await supabase
    .from("selection_options")
    .select("id, selection_id, title, price")
    .eq("id", optionId)
    .single();
  if (!option || option.selection_id !== selectionId) throw new Error("Option not found");

  const { error } = await supabase
    .from("project_selections")
    .update({
      status: "approved",
      selected_option_id: option.id,
      selected_amount: option.price,
    })
    .eq("id", selectionId);
  if (error) throw new Error(error.message);

  const projectTitle = project.title ?? "your project";
  const selectionTitle = `${sel.title ?? "Selection"} → ${option.title}`;
  await sendSelectionApprovedAdminEmail({ projectTitle, projectId, selectionTitle });
  await sendAdminSms(
    `8th Street portal: client chose "${option.title}" for ${sel.title ?? "a selection"} on ${projectTitle}.`
  );

  revalidate(projectId);
}
