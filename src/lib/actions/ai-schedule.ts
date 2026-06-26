"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropicConfigured, BRAND_VOICE } from "@/lib/ai/config";
import { AiNotConfiguredError, generateJson } from "@/lib/ai/client";

export type ScheduledPhase = {
  milestoneId: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
};

type DraftResult = { ok: true; phases: ScheduledPhase[] } | { ok: false; error: string };

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/schedule`);
  revalidatePath(`/admin/projects/${projectId}/milestones`);
  revalidatePath(`/client/projects/${projectId}`);
  revalidatePath(`/client/projects/${projectId}/schedule`);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Generate realistic phase start/end dates from the playbook + a target window. */
export async function draftSchedule(input: {
  projectId: string;
  startDate: string;
  targetEndDate?: string;
}): Promise<DraftResult> {
  await requireAdmin();

  if (!anthropicConfigured()) {
    return { ok: false, error: "Add ANTHROPIC_API_KEY in Vercel to enable AI scheduling." };
  }
  if (!ISO.test(input.startDate)) {
    return { ok: false, error: "Pick a valid start date first." };
  }

  const admin = createAdminClient();
  const [{ data: project }, { data: milestones }] = await Promise.all([
    admin.from("projects").select("title, slug").eq("id", input.projectId).single(),
    admin
      .from("project_milestones")
      .select("id, title, display_order")
      .eq("project_id", input.projectId)
      .order("display_order", { ascending: true }),
  ]);

  if (!milestones?.length) {
    return { ok: false, error: "Apply a build playbook or add milestones first." };
  }

  const phaseList = milestones
    .map((m, i) => `${i + 1}. [${m.id}] ${m.title}`)
    .join("\n");

  const prompt = `Project: ${project?.title ?? "Residential build"}
Start date: ${input.startDate}
${input.targetEndDate ? `Target completion: ${input.targetEndDate}` : "No hard end date — use realistic durations."}

Build phases in order:
${phaseList}

Create a realistic construction schedule. Use typical residential durations and natural sequencing
(phases mostly run back-to-back; minor overlap is fine where trades realistically overlap).
${input.targetEndDate ? "Fit the work so the last phase ends on or before the target completion date." : ""}
Return JSON: { "phases": [ { "milestoneId": string (use the bracketed id), "scheduled_start": "YYYY-MM-DD", "scheduled_end": "YYYY-MM-DD" } ] }
Every milestone id must appear exactly once, in order, with start on/after ${input.startDate}.`;

  try {
    const result = await generateJson<{ phases: ScheduledPhase[] }>({
      system: `${BRAND_VOICE}\nYou are an experienced residential construction scheduler. Output only valid, ordered dates.`,
      prompt,
      maxTokens: 1500,
      temperature: 0.3,
    });

    const byId = new Map(milestones.map((m) => [m.id, m.title]));
    const phases = (result.phases ?? [])
      .filter((p) => byId.has(p.milestoneId) && ISO.test(p.scheduled_start) && ISO.test(p.scheduled_end))
      .map((p) => ({ ...p, title: byId.get(p.milestoneId)! }));

    if (!phases.length) {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }
    return { ok: true, phases };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, error: err.message };
    console.error("draftSchedule failed:", err);
    return { ok: false, error: "AI scheduling failed. Please try again." };
  }
}

/** Persist a generated/edited schedule. Also seeds client-facing target dates. */
export async function applyScheduleDraft(input: {
  projectId: string;
  phases: { milestoneId: string; scheduled_start: string; scheduled_end: string }[];
  setTargetDates?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  for (const phase of input.phases) {
    if (!ISO.test(phase.scheduled_start) || !ISO.test(phase.scheduled_end)) continue;
    await admin
      .from("project_milestones")
      .update({
        scheduled_start: phase.scheduled_start,
        scheduled_end: phase.scheduled_end,
        ...(input.setTargetDates ? { target_date: phase.scheduled_end } : {}),
      })
      .eq("id", phase.milestoneId)
      .eq("project_id", input.projectId);
  }

  revalidate(input.projectId);
  return { ok: true };
}

/**
 * Slip handling: push every phase that starts on/after `fromDate` by `days`.
 * Deterministic — no AI — so a known delay ripples through cleanly.
 */
export async function shiftScheduleFrom(input: {
  projectId: string;
  fromDate: string;
  days: number;
}): Promise<{ ok: boolean; shifted: number; error?: string }> {
  await requireAdmin();
  if (!ISO.test(input.fromDate) || !Number.isFinite(input.days) || input.days === 0) {
    return { ok: false, shifted: 0, error: "Enter a valid date and a non-zero number of days." };
  }

  const admin = createAdminClient();
  const { data: milestones } = await admin
    .from("project_milestones")
    .select("id, scheduled_start, scheduled_end, target_date")
    .eq("project_id", input.projectId);

  const shift = (d: string | null) => {
    if (!d || !ISO.test(d)) return d;
    if (d < input.fromDate) return d;
    const date = new Date(`${d}T12:00:00`);
    date.setDate(date.getDate() + input.days);
    return date.toISOString().slice(0, 10);
  };

  let shifted = 0;
  for (const m of milestones ?? []) {
    const next = {
      scheduled_start: shift(m.scheduled_start),
      scheduled_end: shift(m.scheduled_end),
      target_date: shift(m.target_date),
    };
    if (
      next.scheduled_start !== m.scheduled_start ||
      next.scheduled_end !== m.scheduled_end ||
      next.target_date !== m.target_date
    ) {
      await admin.from("project_milestones").update(next).eq("id", m.id);
      shifted += 1;
    }
  }

  revalidate(input.projectId);
  return { ok: true, shifted };
}
