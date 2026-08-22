"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { trackWorkflowEvent } from "@/lib/analytics/track";

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/bid-requests`);
  revalidatePath(`/admin/projects/${projectId}/costs`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/subcontractors");
  revalidatePath("/subs");
}

async function sendBidInviteEmail(
  to: string,
  company: string,
  rfqTitle: string,
  projectTitle: string,
  bidId: string
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const resend = new Resend(key);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Bid invitation — ${rfqTitle}`,
    html: `<p>${company},</p><p>You are invited to bid on <strong>${rfqTitle}</strong> for <strong>${projectTitle}</strong>.</p><p><a href="${SITE}/subs/bids/${bidId}">Review scope and submit bid →</a></p>`,
    text: `Bid invitation: ${rfqTitle} on ${projectTitle}. ${SITE}/subs/bids/${bidId}`,
  });
}

export async function createBidRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const subIds = formData.getAll("subcontractor_ids").map(String).filter(Boolean);

  if (!subIds.length) throw new Error("Select at least one subcontractor");

  // A library scope, when chosen, is appended in full — the standard is
  // what subs price, not a summary of it.
  let scope = String(formData.get("scope_of_work") ?? "").trim();
  const templateId = String(formData.get("scope_template_id") ?? "").trim();
  if (templateId) {
    const { data: template } = await supabase
      .from("scope_templates")
      .select("title, body_md")
      .eq("id", templateId)
      .single();
    if (template) {
      scope = [scope, `— ${template.title} —`, template.body_md]
        .filter(Boolean)
        .join("\n\n");
    }
  }
  if (!scope) throw new Error("Write a scope of work or pick one from the library");

  const estimateLineId = String(formData.get("estimate_line_id") || "").trim() || null;

  const { data: rfq, error } = await supabase
    .from("bid_requests")
    .insert({
      project_id: projectId,
      title: String(formData.get("title")).trim(),
      scope_of_work: scope,
      trade: String(formData.get("trade")).trim(),
      bid_deadline: String(formData.get("bid_deadline") || "").trim() || null,
      created_by: user.id,
      status: "open",
      estimate_line_id: estimateLineId,
      scope_template_id: templateId || null,
    })
    .select("id, title")
    .single();

  if (error || !rfq) throw new Error(error?.message ?? "Failed to create RFQ");

  const bidRows = subIds.map((subcontractor_id) => ({
    bid_request_id: rfq.id,
    subcontractor_id,
    status: "invited" as const,
  }));

  const { data: createdBids, error: bErr } = await supabase
    .from("bids")
    .insert(bidRows)
    .select("id, subcontractor_id");
  if (bErr || !createdBids) throw new Error(bErr?.message ?? "Could not create bid invitations");
  const bidBySubcontractor = new Map(
    createdBids.map((bid) => [bid.subcontractor_id, bid.id])
  );

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
        const bidId = bidBySubcontractor.get(subId);
        if (!bidId) continue;
        await sendBidInviteEmail(
          profile.email,
          sub.company_name,
          rfq.title,
          project?.title ?? "Project",
          bidId
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
    .select("amount, bid_request:bid_requests(estimate_line_id)")
    .eq("id", bidId)
    .single();
  const request = bid
    ? Array.isArray(bid.bid_request)
      ? bid.bid_request[0]
      : bid.bid_request
    : null;
  const lineId = estimateLineId || request?.estimate_line_id || null;

  await supabase.from("bids").update({ status: "awarded" }).eq("id", bidId);
  await supabase
    .from("bids")
    .update({ status: "declined" })
    .eq("bid_request_id", rfqId)
    .neq("id", bidId)
    .in("status", ["invited", "viewed", "submitted", "shortlisted"]);
  await supabase.from("bid_requests").update({ status: "awarded" }).eq("id", rfqId);

  if (lineId && bid?.amount) {
    const { linkAwardedBidToLine } = await import("@/lib/actions/estimate");
    await linkAwardedBidToLine(projectId, lineId, rfqId, Number(bid.amount));
  }

  await trackWorkflowEvent({
    workflow: "bid",
    event: "complete",
    entityId: bidId,
    projectId,
    metadata: { action: "award" },
  });
  revalidate(projectId);
}

/** Award the bid and open a draft PO in the same motion. */
export async function awardBidAndCreatePurchaseOrder(formData: FormData) {
  await awardBid(formData);
  const { createPurchaseOrderFromBid } = await import("@/lib/actions/purchase-orders");
  await createPurchaseOrderFromBid(formData);
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
  if (!user) return { error: "Not authenticated" };

  const bidId = String(formData.get("bid_id"));
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return { error: "Enter a valid bid amount" };

  const { data: sub } = await supabase
    .from("subcontractors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!sub) return { error: "Subcontractor profile not found" };

  const { data: bid } = await supabase
    .from("bids")
    .select(
      "id, subcontractor_id, status, document_id, bid_requests(id, title, status, bid_deadline, project_id)"
    )
    .eq("id", bidId)
    .single();

  if (!bid || bid.subcontractor_id !== sub.id) return { error: "Unauthorized" };
  if (bid.status === "awarded" || bid.status === "declined") {
    return { error: "This bid is closed" };
  }

  const rawRequest = bid.bid_requests;
  const request = Array.isArray(rawRequest) ? rawRequest[0] : rawRequest;
  if (!request || request.status !== "open") return { error: "This bid request is closed" };
  if (request.bid_deadline && new Date(request.bid_deadline).getTime() < Date.now()) {
    return { error: "The bid deadline has passed. Contact the project manager for access." };
  }

  const admin = createAdminClient();
  const upload = formData.get("document");
  let documentId = bid.document_id;
  let newStoragePath: string | null = null;

  if (upload instanceof File && upload.size > 0) {
    if (upload.size > 10 * 1024 * 1024) {
      return { error: "Bid documents must be 10 MB or smaller." };
    }
    const allowedTypes = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ]);
    if (!allowedTypes.has(upload.type)) {
      return { error: "Upload a PDF, PNG, JPEG, or WebP bid document." };
    }

    const safeName =
      upload.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-") || "bid-document";
    newStoragePath = `${request.project_id}/sub-bids/${bidId}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage
      .from("project-documents")
      .upload(newStoragePath, Buffer.from(await upload.arrayBuffer()), {
        contentType: upload.type,
        upsert: false,
      });
    if (uploadError) return { error: `Could not upload the bid document: ${uploadError.message}` };

    const { data: document, error: documentError } = await admin
      .from("project_documents")
      .insert({
        project_id: request.project_id,
        uploaded_by: user.id,
        title: `${request.title} — subcontractor bid`,
        storage_path: newStoragePath,
        file_type: upload.type,
        category: "other",
        visibility: "internal",
      })
      .select("id")
      .single();
    if (documentError || !document) {
      await admin.storage.from("project-documents").remove([newStoragePath]);
      return { error: documentError?.message ?? "Could not file the bid document" };
    }
    documentId = document.id;
  }

  const { error: updateError } = await admin
    .from("bids")
    .update({
      amount,
      notes: String(formData.get("notes") || "").trim() || null,
      alternates: String(formData.get("alternates") || "").trim() || null,
      exclusions: String(formData.get("exclusions") || "").trim() || null,
      qualifications: String(formData.get("qualifications") || "").trim() || null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      document_id: documentId,
    })
    .eq("id", bidId)
    .eq("subcontractor_id", sub.id);
  if (updateError) {
    if (newStoragePath && documentId) {
      await admin.from("project_documents").delete().eq("id", documentId);
      await admin.storage.from("project-documents").remove([newStoragePath]);
    }
    return { error: updateError.message };
  }

  if (newStoragePath && bid.document_id && bid.document_id !== documentId) {
    const { data: oldDocument } = await admin
      .from("project_documents")
      .select("storage_path")
      .eq("id", bid.document_id)
      .maybeSingle();
    await admin.from("project_documents").delete().eq("id", bid.document_id);
    if (oldDocument?.storage_path) {
      await admin.storage.from("project-documents").remove([oldDocument.storage_path]);
    }
  }

  await trackWorkflowEvent({
    workflow: "bid",
    event: "complete",
    entityId: bidId,
    projectId: request.project_id,
  });
  revalidatePath("/subs");
  revalidatePath(`/subs/bids/${bidId}`);
  revalidatePath(`/admin/projects/${request.project_id}/bid-requests`);
  return { ok: true };
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
