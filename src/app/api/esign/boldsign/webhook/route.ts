import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  downloadSignedDocument,
  verifyWebhookSignature,
} from "@/lib/esign/boldsign";
import { reportError } from "@/lib/observability/report-error";
import { sendAdminSms } from "@/lib/sms/ghl";
import { sendPushToAdmins } from "@/lib/notify/push";
import { trackWorkflowEvent } from "@/lib/analytics/track";

/**
 * BoldSign webhook — closes the e-sign loop the send action opens.
 * Configure in BoldSign: API -> Webhooks -> this URL, events Completed,
 * Declined, Revoked, Expired; put the endpoint's secret in
 * BOLDSIGN_WEBHOOK_SECRET.
 *
 * Runs on the service role: a webhook has no user session, and the
 * contract is looked up by the envelope id we recorded at send time —
 * tenant attribution comes from that row, never from the payload.
 * (Deliberate admin-client baseline entry, per the usage ratchet.)
 */

export const runtime = "nodejs";

type BoldSignEvent = {
  event?: { eventType?: string };
  document?: { documentId?: string };
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  // BoldSign signs deliveries with the account API key unless a separate
  // webhook secret is configured. Its "Verify" ping (sent when the webhook
  // is created in the dashboard) is unsigned and expects a 200 — so an
  // unverified request gets a 200 with NO side effects, never a 401 that
  // would block webhook registration. State only ever changes below the
  // signature check.
  const verified = verifyWebhookSignature(
    rawBody,
    request.headers.get("x-boldsign-signature"),
    process.env.BOLDSIGN_WEBHOOK_SECRET ?? process.env.BOLDSIGN_API_KEY
  );
  if (!verified) {
    return NextResponse.json({ ok: true, verified: false });
  }

  let payload: BoldSignEvent;
  try {
    payload = JSON.parse(rawBody) as BoldSignEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event?.eventType ?? "";
  const documentId = payload.document?.documentId;
  // Verification pings and per-signer progress events need no state change.
  if (!documentId || !["Completed", "Declined", "Revoked", "Expired"].includes(eventType)) {
    return NextResponse.json({ ok: true, ignored: eventType || "no-document" });
  }

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("project_contracts")
    .select(
      "id, project_id, org_id, number, title, contract_price, status, project:projects(id, title, street_address)"
    )
    .eq("esign_envelope_id", documentId)
    .maybeSingle();
  if (!contract) {
    // Not ours (or a replay after deletion) — acknowledge so BoldSign stops retrying.
    return NextResponse.json({ ok: true, ignored: "unknown-envelope" });
  }

  const project = Array.isArray(contract.project) ? contract.project[0] : contract.project;

  if (eventType !== "Completed") {
    const note = `BoldSign envelope ${eventType.toLowerCase()} — back to draft`;
    await admin
      .from("project_contracts")
      .update({
        status: "draft",
        esign_status: eventType.toLowerCase(),
        status_note: note,
      })
      .eq("id", contract.id)
      .eq("status", "out_for_signature");
    await trackWorkflowEvent({
      workflow: "contract",
      event: "abandon",
      entityId: contract.id,
      projectId: contract.project_id,
    });
    return NextResponse.json({ ok: true });
  }

  if (contract.status === "signed") {
    return NextResponse.json({ ok: true, ignored: "already-signed" });
  }

  try {
    const signedPdf = await downloadSignedDocument(documentId);

    const storagePath = `${contract.project_id}/contracts/agreement-${contract.number}-boldsign-${documentId.slice(0, 8)}-signed.pdf`;
    const { error: uploadError } = await admin.storage
      .from("project-documents")
      .upload(storagePath, signedPdf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) throw new Error(`storage upload: ${uploadError.message}`);

    const { data: doc, error: docError } = await admin
      .from("project_documents")
      .insert({
        project_id: contract.project_id,
        org_id: contract.org_id,
        title: `${contract.title} (signed)`,
        description: `Executed via BoldSign, envelope ${documentId}.`,
        storage_path: storagePath,
        file_type: "application/pdf",
        file_size_bytes: signedPdf.byteLength,
        category: "contract",
        visibility: "client",
      })
      .select("id")
      .single();
    if (docError) throw new Error(`document insert: ${docError.message}`);

    const { error: contractError } = await admin
      .from("project_contracts")
      .update({
        status: "signed",
        esign_status: "completed",
        signed_document_id: doc.id,
        status_note: `Signed via BoldSign, envelope ${documentId}`,
      })
      .eq("id", contract.id);
    if (contractError) throw new Error(`contract update: ${contractError.message}`);

    // Signing is the moment the number becomes the contract — same as the
    // manual and portal signing paths.
    await admin
      .from("projects")
      .update({ contract_value: Number(contract.contract_price) })
      .eq("id", contract.project_id);

    await Promise.allSettled([
      sendAdminSms(
        `8th Street: agreement #${contract.number} on ${project?.title ?? "a project"} fully signed via BoldSign.`
      ),
      sendPushToAdmins({
        title: project?.title ?? "Agreement signed",
        body: `Agreement #${contract.number} fully signed via BoldSign`,
        url: `/admin/contracts/${contract.id}`,
      }),
      trackWorkflowEvent({
        workflow: "contract",
        event: "complete",
        entityId: contract.id,
        projectId: contract.project_id,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    reportError("boldsign.webhook.completed", err, {
      contractId: contract.id,
      documentId,
    });
    // 500 so BoldSign retries — the envelope is signed, we just failed to file it.
    return NextResponse.json({ error: "Failed to file signed document" }, { status: 500 });
  }
}
