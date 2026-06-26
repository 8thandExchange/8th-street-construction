"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropicConfigured, BRAND_VOICE } from "@/lib/ai/config";
import { AiNotConfiguredError, generateJson } from "@/lib/ai/client";
import { ESTIMATE_DIVISIONS } from "@/lib/estimate/divisions";

export type EstimateLineDraft = {
  division_code: string;
  trade_label: string;
  estimated_amount: number;
  basis: string;
};

type DraftResult =
  | { ok: true; lines: EstimateLineDraft[]; total: number; assumptions: string }
  | { ok: false; error: string };

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/costs`);
  revalidatePath(`/admin/projects/${projectId}`);
}

/**
 * Draft a ballpark cost plan across standard divisions from project parameters
 * (and optional plan PDF). Explicitly a starting framework to refine with bids.
 */
export async function draftEstimate(input: {
  projectId: string;
  planUrls?: string[];
}): Promise<DraftResult> {
  await requireAdmin();

  if (!anthropicConfigured()) {
    return { ok: false, error: "Add ANTHROPIC_API_KEY in Vercel to enable AI estimating." };
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("title, location, square_footage, project_type")
    .eq("id", input.projectId)
    .single();

  if (!project) return { ok: false, error: "Project not found." };

  const divisions = ESTIMATE_DIVISIONS.map(
    (d) => `- ${d.code} | ${d.tradeLabel}: ${d.description}`
  ).join("\n");

  const planUrls = (input.planUrls ?? []).filter(Boolean);

  const prompt = `Project: ${project.title}
${project.location ? `Location: ${project.location}` : ""}
${project.square_footage ? `Heated square feet: ${project.square_footage}` : "Square footage: unknown"}
${project.project_type ? `Type: ${project.project_type}` : ""}
Market: Augusta, Georgia (CSRA) residential construction.
${planUrls.length ? "A plan set PDF is attached — use it to inform scope and quantities." : ""}

Produce a ballpark DIRECT-COST estimate across these standard divisions:
${divisions}

Return JSON:
{
  "assumptions": string (1-2 sentences on what these numbers assume),
  "lines": [ { "division_code": string (from the list), "estimated_amount": number (USD, direct cost), "basis": string (short rationale, e.g. "$X/sf framing") } ]
}
Use realistic current Augusta-market direct costs. Include every division (0 if truly not applicable).
These are rough planning numbers to refine with real sub quotes — do not present as firm bids.`;

  try {
    const ai = await generateJson<{
      assumptions: string;
      lines: { division_code: string; estimated_amount: number; basis: string }[];
    }>({
      system: `${BRAND_VOICE}\nYou are a residential construction estimator for the Augusta, GA market. Give realistic ballpark direct costs, never inflated. Always frame as a starting estimate to refine with bids.`,
      prompt,
      documents: planUrls,
      maxTokens: 1800,
      temperature: 0.3,
    });

    const labelByCode = new Map(ESTIMATE_DIVISIONS.map((d) => [d.code, d.tradeLabel]));
    const lines: EstimateLineDraft[] = (ai.lines ?? [])
      .filter((l) => labelByCode.has(l.division_code))
      .map((l) => ({
        division_code: l.division_code,
        trade_label: labelByCode.get(l.division_code)!,
        estimated_amount: Math.max(0, Math.round(Number(l.estimated_amount) || 0)),
        basis: l.basis ?? "",
      }));

    if (!lines.length) {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }

    const total = lines.reduce((s, l) => s + l.estimated_amount, 0);
    return { ok: true, lines, total, assumptions: ai.assumptions ?? "" };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, error: err.message };
    console.error("draftEstimate failed:", err);
    return { ok: false, error: "AI estimating failed. Please try again." };
  }
}

export async function applyEstimateDraft(input: {
  projectId: string;
  lines: EstimateLineDraft[];
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { count } = await admin
    .from("project_estimate_lines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.projectId);

  if ((count ?? 0) > 0) {
    return { ok: false, error: "A cost plan already exists. Clear it first to apply an AI draft." };
  }

  const order = new Map(ESTIMATE_DIVISIONS.map((d, i) => [d.code, i]));
  const rows = input.lines.map((l) => ({
    project_id: input.projectId,
    division_code: l.division_code,
    trade_label: l.trade_label,
    estimated_amount: l.estimated_amount,
    notes: l.basis ? `AI: ${l.basis}` : null,
    display_order: order.get(l.division_code) ?? 99,
  }));

  const { error } = await admin.from("project_estimate_lines").insert(rows);
  if (error) return { ok: false, error: error.message };

  const total = rows.reduce((s, r) => s + r.estimated_amount, 0);
  await admin
    .from("projects")
    .update({
      estimated_cost: total,
      estimate_notes: "AI-drafted ballpark — refine as sub quotes arrive.",
      estimate_updated_at: new Date().toISOString(),
    })
    .eq("id", input.projectId);

  revalidate(input.projectId);
  return { ok: true };
}
