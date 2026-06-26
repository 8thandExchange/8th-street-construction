"use server";

import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropicConfigured } from "@/lib/ai/config";
import { BRAND_VOICE } from "@/lib/ai/config";
import { AiNotConfiguredError, generateJson } from "@/lib/ai/client";

export type DraftedUpdate = {
  title: string;
  body: string;
};

type DraftResult =
  | { ok: true; draft: DraftedUpdate }
  | { ok: false; error: string };

/**
 * Draft a client-facing progress update from recent field activity:
 * daily logs, milestone status, and recently completed tasks.
 */
export async function draftClientUpdate(projectId: string): Promise<DraftResult> {
  await requireAdmin();

  if (!anthropicConfigured()) {
    return {
      ok: false,
      error: "Add ANTHROPIC_API_KEY in Vercel to enable AI drafting.",
    };
  }

  const admin = createAdminClient();

  const [{ data: project }, { data: logs }, { data: milestones }, { data: recentTasks }] =
    await Promise.all([
      admin.from("projects").select("title, location").eq("id", projectId).single(),
      admin
        .from("project_daily_logs")
        .select("log_date, weather, crew_count, summary, issues")
        .eq("project_id", projectId)
        .order("log_date", { ascending: false })
        .limit(7),
      admin
        .from("project_milestones")
        .select("title, status, target_date")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true }),
      admin
        .from("project_tasks")
        .select("title, status, completed_at")
        .eq("project_id", projectId)
        .eq("status", "done")
        .order("completed_at", { ascending: false })
        .limit(15),
    ]);

  if (!project) return { ok: false, error: "Project not found." };

  const logText = (logs ?? [])
    .map(
      (l) =>
        `- ${l.log_date}${l.weather ? ` (${l.weather})` : ""}: ${l.summary}${
          l.issues ? ` | Issues: ${l.issues}` : ""
        }`
    )
    .join("\n");

  const milestoneText = (milestones ?? [])
    .map((m) => `- ${m.title}: ${m.status}${m.target_date ? ` (target ${m.target_date})` : ""}`)
    .join("\n");

  const taskText = (recentTasks ?? []).map((t) => `- ${t.title}`).join("\n");

  if (!logText && !taskText && !(milestones ?? []).some((m) => m.status !== "pending")) {
    return {
      ok: false,
      error: "Not enough recent activity yet. Add a daily log or complete a task first.",
    };
  }

  const prompt = `Project: ${project.title}${project.location ? ` (${project.location})` : ""}

Recent daily logs (newest first):
${logText || "None recorded."}

Build phases and status:
${milestoneText || "None."}

Recently completed tasks:
${taskText || "None."}

Write a short progress update for the homeowner/client based ONLY on the above.
Return JSON: { "title": string (max ~8 words), "body": string (2-4 short paragraphs, warm and clear, no markdown) }.
Focus on what was accomplished and what's next. Do not mention internal costs, subcontractor names, or invent details.`;

  try {
    const draft = await generateJson<DraftedUpdate>({
      system: BRAND_VOICE,
      prompt,
      maxTokens: 900,
      temperature: 0.6,
    });

    if (!draft?.title || !draft?.body) {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }
    return { ok: true, draft };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return { ok: false, error: err.message };
    }
    console.error("draftClientUpdate failed:", err);
    return { ok: false, error: "AI drafting failed. Please try again." };
  }
}
