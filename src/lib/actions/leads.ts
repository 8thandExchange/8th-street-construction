"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { leadAdminUpdateSchema } from "@/lib/validations";
import { uniqueProjectSlug, normalizeCategory } from "@/lib/project/create";

function revalidateLeadPaths(id: string) {
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export async function updateLeadPipeline(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const notes = String(formData.get("notes") || "").trim() || null;

  const update: Record<string, unknown> = {
    status,
    notes,
    updated_at: new Date().toISOString(),
  };

  if (status === "contacted") update.contacted_at = new Date().toISOString();
  if (status === "qualified") update.qualified_at = new Date().toISOString();
  if (["won", "lost", "archived"].includes(status)) {
    update.closed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidateLeadPaths(id);
}

export async function updateLead(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));

  const parsed = leadAdminUpdateSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    project_type: formData.get("project_type") || undefined,
    message: formData.get("message"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid lead data.");
  }

  const { status, notes, ...contact } = parsed.data;
  const update: Record<string, unknown> = {
    ...contact,
    status,
    notes,
    updated_at: new Date().toISOString(),
  };

  if (status === "contacted") update.contacted_at = new Date().toISOString();
  if (status === "qualified") update.qualified_at = new Date().toISOString();
  if (["won", "lost", "archived"].includes(status)) {
    update.closed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidateLeadPaths(id);
}

export async function convertLeadToProject(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  if (!lead) throw new Error("Lead not found");

  const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  const title = leadName || lead.email || "New Project";
  const slug = await uniqueProjectSlug(supabase, title);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      slug,
      title,
      category: normalizeCategory(lead.project_type),
      status: "pre_construction",
      excerpt: lead.message ? String(lead.message).slice(0, 280) : null,
      narrative: lead.message || null,
      published_at: null,
    })
    .select("id")
    .single();

  if (error || !project) {
    throw new Error(error?.message ?? "Could not create project from lead");
  }

  await supabase
    .from("leads")
    .update({
      status: "won",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidateLeadPaths(id);
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${project.id}`);
}

export async function deleteLead(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  redirect("/admin/leads");
}
