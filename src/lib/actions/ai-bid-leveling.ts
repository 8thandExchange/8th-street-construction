"use server";

import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropicConfigured, BRAND_VOICE } from "@/lib/ai/config";
import { AiNotConfiguredError, generateJson } from "@/lib/ai/client";

export type BidLevelingResult = {
  stats: { count: number; low: number; high: number; average: number; spreadPct: number };
  summary: string;
  recommendation: string;
  bids: {
    company: string;
    amount: number;
    vsAveragePct: number;
    flag: "low" | "high" | "normal";
    note: string;
  }[];
};

type Result = { ok: true; analysis: BidLevelingResult } | { ok: false; error: string };

export async function levelBids(bidRequestId: string): Promise<Result> {
  await requireAdmin();

  if (!anthropicConfigured()) {
    return { ok: false, error: "Add ANTHROPIC_API_KEY in Vercel to enable AI bid leveling." };
  }

  const admin = createAdminClient();
  const { data: rfq } = await admin
    .from("bid_requests")
    .select(
      "title, trade, scope_of_work, bids(amount, notes, status, subcontractors(company_name))"
    )
    .eq("id", bidRequestId)
    .single();

  if (!rfq) return { ok: false, error: "Bid request not found." };

  const rawBids = (Array.isArray(rfq.bids) ? rfq.bids : []).filter(
    (b) => b.amount != null && Number(b.amount) > 0
  );

  if (rawBids.length < 2) {
    return { ok: false, error: "Need at least two priced bids to level." };
  }

  const priced = rawBids.map((b) => {
    const sub = Array.isArray(b.subcontractors) ? b.subcontractors[0] : b.subcontractors;
    return {
      company: sub?.company_name ?? "Unknown",
      amount: Number(b.amount),
      notes: (b.notes ?? "").trim(),
    };
  });

  const amounts = priced.map((b) => b.amount);
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  const average = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const spreadPct = low > 0 ? Math.round(((high - low) / low) * 100) : 0;

  const bidLines = priced
    .map((b) => `- ${b.company}: $${b.amount.toLocaleString()}${b.notes ? ` — notes: ${b.notes}` : ""}`)
    .join("\n");

  const prompt = `RFQ: ${rfq.title} (${rfq.trade})
Scope of work:
${rfq.scope_of_work}

Bids received:
${bidLines}

Stats: low $${low.toLocaleString()}, high $${high.toLocaleString()}, average $${Math.round(average).toLocaleString()}, spread ${spreadPct}%.

Level these bids for the builder. Consider price spread, any scope gaps or exclusions in notes,
and outliers (very low can mean missing scope; very high can mean padding).
Return JSON:
{
  "summary": string (2-3 sentences on how the bids compare),
  "recommendation": string (which to consider and what to clarify before awarding),
  "bids": [ { "company": string, "amount": number, "flag": "low" | "high" | "normal", "note": string (short, e.g. scope concern or 'in line with others') } ]
}
Include every bid. Do not invent scope items not implied by the notes.`;

  try {
    const ai = await generateJson<{
      summary: string;
      recommendation: string;
      bids: { company: string; amount: number; flag: "low" | "high" | "normal"; note: string }[];
    }>({
      system: `${BRAND_VOICE}\nYou are a seasoned construction estimator doing bid leveling. Be practical and protect the builder's margin and scope.`,
      prompt,
      maxTokens: 1100,
      temperature: 0.3,
    });

    const bids = (ai.bids ?? []).map((b) => {
      const amount = Number(b.amount) || priced.find((p) => p.company === b.company)?.amount || 0;
      return {
        company: b.company,
        amount,
        vsAveragePct: average > 0 ? Math.round(((amount - average) / average) * 100) : 0,
        flag: b.flag ?? "normal",
        note: b.note ?? "",
      };
    });

    return {
      ok: true,
      analysis: {
        stats: { count: priced.length, low, high, average: Math.round(average), spreadPct },
        summary: ai.summary ?? "",
        recommendation: ai.recommendation ?? "",
        bids,
      },
    };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, error: err.message };
    console.error("levelBids failed:", err);
    return { ok: false, error: "AI bid leveling failed. Please try again." };
  }
}
