"use server";

import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropicConfigured, BRAND_VOICE } from "@/lib/ai/config";
import { AiNotConfiguredError, generateJson } from "@/lib/ai/client";

export type DraftedDailyLog = {
  summary: string;
  issues: string;
  weather?: string;
};

type DraftResult = { ok: true; draft: DraftedDailyLog } | { ok: false; error: string };

/**
 * Turn rough field notes and/or jobsite photos into a clean daily log.
 * Vision-enabled: Claude can read what is visible in the photos.
 */
export async function draftDailyLog(input: {
  projectId: string;
  notes?: string;
  imageUrls?: string[];
}): Promise<DraftResult> {
  await requireAdmin();

  if (!anthropicConfigured()) {
    return { ok: false, error: "Add ANTHROPIC_API_KEY in Vercel to enable AI drafting." };
  }

  const notes = (input.notes ?? "").trim();
  const images = (input.imageUrls ?? []).filter(Boolean);

  if (!notes && images.length === 0) {
    return { ok: false, error: "Add a few notes or photos for the AI to work from." };
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("title")
    .eq("id", input.projectId)
    .single();

  const prompt = `Project: ${project?.title ?? "Construction project"}

Field notes from the crew (may be rough/shorthand):
${notes || "(none — rely on the photos)"}

${images.length ? `There are ${images.length} jobsite photo(s) attached. Describe relevant work visible in them.` : ""}

Write a professional construction daily log from this. Return JSON:
{
  "summary": string (work completed today, clear and specific, 2-5 sentences),
  "issues": string (delays, problems, or blockers; empty string "" if none),
  "weather": string (only if explicitly stated in the notes; otherwise "")
}
Be factual — only describe work actually mentioned or clearly visible. Do not invent specifics.`;

  try {
    const draft = await generateJson<DraftedDailyLog>({
      system: `${BRAND_VOICE}\nYou are writing an internal construction daily log for the builder's own records — factual and specific, trade-aware language is fine here.`,
      prompt,
      images,
      maxTokens: 700,
      temperature: 0.4,
    });

    if (typeof draft?.summary !== "string") {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }
    return {
      ok: true,
      draft: {
        summary: draft.summary,
        issues: draft.issues ?? "",
        weather: draft.weather ?? "",
      },
    };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, error: err.message };
    console.error("draftDailyLog failed:", err);
    return { ok: false, error: "AI drafting failed. Please try again." };
  }
}
