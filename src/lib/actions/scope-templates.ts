"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

/**
 * The standards library. A technique that lives here — advanced framing,
 * the air-sealing package, heat-pump equipment specs — gets prefilled
 * into bid requests, so it's what subs actually price, not a hope.
 */

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidate() {
  revalidatePath("/admin/settings/scopes");
}

export async function saveScopeTemplate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const trade = str(formData, "trade");
  const title = str(formData, "title");
  const body = str(formData, "body_md");
  if (!trade || !title || !body)
    throw new Error("A scope needs a trade, a title, and the written scope itself");

  const row = { trade, title, body_md: body };
  const { error } = id
    ? await supabase.from("scope_templates").update(row).eq("id", id)
    : await supabase.from("scope_templates").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteScopeTemplate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const { error } = await supabase.from("scope_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
