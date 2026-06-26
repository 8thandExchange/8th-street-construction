import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { shareCookieName, shareSessionValue } from "./password";

export type ShareProject = {
  id: string;
  title: string;
  location: string | null;
  start_date: string | null;
  target_completion_date: string | null;
  status: string;
  share_password_hash: string;
};

type ShareAccess =
  | { state: "not_found" }
  | { state: "locked"; project: { title: string } }
  | { state: "unlocked"; project: ShareProject };

/** Resolve a share token + cookie into an access decision. Service-role read. */
export async function resolveShareAccess(token: string): Promise<ShareAccess> {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select(
      "id, title, location, start_date, target_completion_date, status, share_password_hash, share_enabled"
    )
    .eq("share_token", token)
    .maybeSingle();

  if (!project || !project.share_enabled || !project.share_password_hash) {
    return { state: "not_found" };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(shareCookieName(token))?.value;
  const expected = shareSessionValue(token, project.share_password_hash);

  if (cookie && cookie === expected) {
    return { state: "unlocked", project: project as ShareProject };
  }

  return { state: "locked", project: { title: project.title } };
}

/** Load milestones for an unlocked share project (service-role, client-safe fields). */
export async function loadShareMilestones(projectId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_milestones")
    .select("id, title, status, target_date, scheduled_start, scheduled_end, display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function loadShareUpdates(projectId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_updates")
    .select("id, title, body, created_at, project_update_images(id, public_url, caption)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(6);
  return data ?? [];
}
