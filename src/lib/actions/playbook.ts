"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { applyPlaybookToProject } from "@/lib/build/apply-playbook";
import { GEORGIA_RESIDENTIAL_PLAYBOOK } from "@/lib/build/georgia-residential-playbook";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/build`);
  revalidatePath(`/admin/projects/${projectId}/tasks`);
  revalidatePath(`/admin/projects/${projectId}/milestones`);
}

export async function applyGeorgiaPlaybook(formData: FormData) {
  const { user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const replace = formData.get("replace") === "on";

  const result = await applyPlaybookToProject(projectId, GEORGIA_RESIDENTIAL_PLAYBOOK.id, {
    replaceExisting: replace,
    createdBy: user.id,
  });

  if ("error" in result) return result;
  revalidateProject(projectId);
  return result;
}
