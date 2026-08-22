"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/daily-logs`);
  revalidatePath(`/client/projects/${projectId}/daily-logs`);
  revalidatePath(`/client/projects/${projectId}`);
}

type DailyLogImageInput = { path: string; caption?: string };

function parseImages(formData: FormData, projectId: string): DailyLogImageInput[] {
  const raw = String(formData.get("images") ?? "").trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Photo details are invalid. Remove the photos and upload them again.");
  }
  if (!Array.isArray(parsed) || parsed.length > 20) {
    throw new Error("A daily log can include up to 20 photos.");
  }
  return parsed.map((value) => {
    const image = value as Record<string, unknown>;
    const path = String(image.path ?? "");
    if (!path.startsWith(`${projectId}/`) || path.includes("..")) {
      throw new Error("A photo does not belong to this project.");
    }
    return {
      path,
      caption: String(image.caption ?? "").trim() || undefined,
    };
  });
}

export async function createDailyLog(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const images = parseImages(formData, projectId);

  const { data: log, error } = await supabase
    .from("project_daily_logs")
    .insert({
      project_id: projectId,
      log_date: String(formData.get("log_date")),
      weather: String(formData.get("weather") || "").trim() || null,
      crew_count: formData.get("crew_count") ? Number(formData.get("crew_count")) : null,
      summary: String(formData.get("summary")).trim(),
      issues: String(formData.get("issues") || "").trim() || null,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error || !log) return { error: error?.message ?? "Could not save the daily log" };

  if (images.length > 0) {
    const { error: imageError } = await supabase.from("project_daily_log_images").insert(
      images.map((image, index) => ({
        daily_log_id: log.id,
        storage_path: image.path,
        caption: image.caption ?? null,
        display_order: index,
      }))
    );
    if (imageError) {
      await supabase.from("project_daily_logs").delete().eq("id", log.id);
      return { error: `The log was not saved because its photos could not be filed: ${imageError.message}` };
    }
  }

  revalidate(projectId);
  return { ok: true };
}

export async function deleteDailyLog(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const id = String(formData.get("id"));

  const { data: images } = await supabase
    .from("project_daily_log_images")
    .select("storage_path")
    .eq("daily_log_id", id);
  const { error } = await supabase.from("project_daily_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from("project-updates").remove(paths);
  }
  revalidate(projectId);
  return { ok: true };
}
