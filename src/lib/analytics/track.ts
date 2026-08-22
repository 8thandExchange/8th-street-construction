import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type WorkflowEventName = "start" | "complete" | "abandon";

export async function trackWorkflowEvent(input: {
  workflow: string;
  event: WorkflowEventName;
  entityId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle()
      : { data: null };

    await createAdminClient().from("workflow_events").insert({
      actor_id: profile?.id ?? user?.id ?? null,
      role: profile?.role ?? null,
      workflow: input.workflow,
      event: input.event,
      entity_id: input.entityId ?? null,
      project_id: input.projectId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("[workflow-analytics]", error);
  }
}
