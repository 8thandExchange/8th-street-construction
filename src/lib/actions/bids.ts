"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/bid-requests`);
  revalidatePath(`/admin/projects/${projectId}/costs`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/subcontractors");
  revalidatePath("/subs");
}

async function sendBidInviteEmail(to: string, company: string, rfqTitle: string, projectTitle: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const resend = new Resend(key);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Bid invitation — ${rfqTitle}`,
    html: `<p>${company},</p><p>You are invited to bid on <strong>${rfqTitle}</strong> for <strong>${projectTitle}</strong>.</p><p><a href="${SITE}/subs">Open subcontractor portal →</a></p>`,
    text: `Bid invitation: ${rfqTitle} on ${projectTitle}. ${SITE}/subs`,
  });
}

export async function createBidRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const subIds = formData.getAll("subcontractor_ids").map(String).filter(Boolean);

  if (!subIds.length) throw new Error("Select at least one subcontractor");

  const { data: rfq, error } = await supabase
    .from("bid_requests")
    .insert({
      project_id: projectId,
      title: String(formData.get("title")).trim(),
      scope_of_work: String(formData.get("scope_of_work")).trim(),
      trade: String(formData.get("trade")).trim(),
      bid_deadline: String(formData.get("bid_deadline") || "").trim() || null,
      created_by: user.id,
      status: "open",
    })
    .select("id, title")
    .single();

  if (error || !rfq) throw new Error(error?.message ?? "Failed to create RFQ");

  const bidRows = subIds.map((subcontractor_id) => ({
    bid_request_id: rfq.id,
    subcontractor_id,
    status: "invited" as const,
  }));

  const { error: bErr } = await supabase.from("bids").insert(bidRows);
  if (bErr) throw new Error(bErr.message);

  const admin = createAdminClient();
  const { data: project } = await admin.from("projects").select("title").eq("id", projectId).single();

  for (const subId of subIds) {
    const { data: sub } = await admin
      .from("subcontractors")
      .select("company_name, profile_id")
      .eq("id", subId)
      .single();
    if (sub?.profile_id) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", sub.profile_id)
        .single();
      if (profile?.email) {
        await sendBidInviteEmail(
          profile.email,
          sub.company_name,
          rfq.title,
          project?.title ?? "Project"
        );
      }
    }
  }

  revalidate(projectId);
}

export async function awardBid(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const bidId = String(formData.get("bid_id"));
  const rfqId = String(formData.get("bid_request_id"));
  const estimateLineId = String(formData.get("estimate_line_id") || "").trim() || null;

  const { data: bid } = await supabase
    .from("bids")
    .select("amount")
    .eq("id", bidId)
    .single();

  await supabase.from("bids").update({ status: "awarded" }).eq("id", bidId);
  await supabase
    .from("bids")
    .update({ status: "declined" })
    .eq("bid_request_id", rfqId)
    .neq("id", bidId)
    .in("status", ["invited", "viewed", "submitted", "shortlisted"]);
  await supabase.from("bid_requests").update({ status: "awarded" }).eq("id", rfqId);

  if (estimateLineId && bid?.amount) {
    const { linkAwardedBidToLine } = await import("@/lib/actions/estimate");
    await linkAwardedBidToLine(projectId, estimateLineId, rfqId, Number(bid.amount));
  }

  revalidate(projectId);
}

/** Record a sub quote from email, phone, or scanned PDF — no portal login required */
export async function recordManualSubQuote(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const companyName = String(formData.get("company_name")).trim();
  const trade = String(formData.get("trade")).trim();
  const title = String(formData.get("title") || trade).trim();
  const amount = Number(formData.get("amount"));
  const scope = String(formData.get("scope_of_work") || "").trim() || `${trade} work per quote`;
  const documentId = String(formData.get("document_id") || "").trim() || null;
  const estimateLineId = String(formData.get("estimate_line_id") || "").trim() || null;
  const awardNow = formData.get("award_now") === "on";

  if (!companyName || !trade || !amount) {
    throw new Error("Company name, trade, and quote amount are required.");
  }

  let subId = String(formData.get("subcontractor_id") || "").trim() || null;

  if (!subId) {
    const { data: existing } = await supabase
      .from("subcontractors")
      .select("id")
      .ilike("company_name", companyName)
      .maybeSingle();

    if (existing) {
      subId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("subcontractors")
        .insert({
          company_name: companyName,
          trade,
          preferred: false,
          active: true,
          notes: "Added from manual quote entry",
        })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message ?? "Could not add subcontractor");
      subId = created.id;
    }
  }

  const { data: rfq, error: rfqErr } = await supabase
    .from("bid_requests")
    .insert({
      project_id: projectId,
      title,
      scope_of_work: scope,
      trade,
      created_by: user.id,
      status: awardNow ? "awarded" : "closed",
      estimate_line_id: estimateLineId,
    })
    .select("id")
    .single();

  if (rfqErr || !rfq) throw new Error(rfqErr?.message ?? "Failed to save quote request");

  const { data: bid, error: bidErr } = await supabase
    .from("bids")
    .insert({
      bid_request_id: rfq.id,
      subcontractor_id: subId,
      amount,
      status: awardNow ? "awarded" : "submitted",
      submitted_at: new Date().toISOString(),
      source: "manual",
      document_id: documentId,
      notes: String(formData.get("notes") || "").trim() || null,
    })
    .select("id")
    .single();

  if (bidErr) throw new Error(bidErr.message);

  if (awardNow && estimateLineId) {
    const { linkAwardedBidToLine } = await import("@/lib/actions/estimate");
    await linkAwardedBidToLine(projectId, estimateLineId, rfq.id, amount);
  }

  revalidate(projectId);
  return { bidId: bid?.id };
}

export async function closeBidRequest(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  await supabase
    .from("bid_requests")
    .update({ status: "closed" })
    .eq("id", String(formData.get("bid_request_id")));
  revalidate(projectId);
}

export async function submitBid(formData: FormData) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const bidId = String(formData.get("bid_id"));
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) throw new Error("Enter a valid bid amount");

  const { data: sub } = await supabase
    .from("subcontractors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!sub) throw new Error("Subcontractor profile not found");

  const { data: bid } = await supabase
    .from("bids")
    .select("id, subcontractor_id, status")
    .eq("id", bidId)
    .single();

  if (!bid || bid.subcontractor_id !== sub.id) throw new Error("Unauthorized");
  if (bid.status === "awarded" || bid.status === "declined") {
    throw new Error("This bid is closed");
  }

  await supabase
    .from("bids")
    .update({
      amount,
      notes: String(formData.get("notes") || "").trim() || null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", bidId);

  revalidatePath("/subs");
}

export async function createSubcontractor(formData: FormData) {
  const { supabase } = await requireAdmin();

  const profileId = String(formData.get("profile_id") || "").trim() || null;

  const { error } = await supabase.from("subcontractors").insert({
    profile_id: profileId,
    company_name: String(formData.get("company_name")).trim(),
    trade: String(formData.get("trade")).trim(),
    license_number: String(formData.get("license_number") || "").trim() || null,
    insurance_expires: String(formData.get("insurance_expires") || "").trim() || null,
    preferred: formData.get("preferred") === "on",
    notes: String(formData.get("notes") || "").trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/subcontractors");
}

export async function updateSubcontractor(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const profileId = String(formData.get("profile_id") || "").trim() || null;

  const { error } = await supabase
    .from("subcontractors")
    .update({
      profile_id: profileId,
      company_name: String(formData.get("company_name")).trim(),
      trade: String(formData.get("trade")).trim(),
      license_number: String(formData.get("license_number") || "").trim() || null,
      insurance_expires: String(formData.get("insurance_expires") || "").trim() || null,
      preferred: formData.get("preferred") === "on",
      notes: String(formData.get("notes") || "").trim() || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/subcontractors");
}

export async function toggleSubcontractorActive(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";

  const { error } = await supabase
    .from("subcontractors")
    .update({ active: !active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/subcontractors");
  revalidatePath("/subs");
}
