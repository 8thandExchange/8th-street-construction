"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { applyPlaybookToProject } from "@/lib/build/apply-playbook";
import { DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/build`);
  revalidatePath(`/admin/projects/${projectId}/tasks`);
  revalidatePath(`/admin/projects/${projectId}/milestones`);
}

export async function applyResidentialPlaybook(formData: FormData) {
  const { user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const replace = formData.get("replace") === "on";
  const playbookId =
    String(formData.get("playbook_id") || "").trim() || DEFAULT_PLAYBOOK_ID;

  const result = await applyPlaybookToProject(projectId, playbookId, {
    replaceExisting: replace,
    createdBy: user.id,
  });

  if ("error" in result) {
    throw new Error(result.error);
  }
  revalidateProject(projectId);
}
