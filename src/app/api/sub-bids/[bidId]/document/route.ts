import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bidId: string }> }
) {
  const { bidId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subcontractors")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: bid } = await supabase
    .from("bids")
    .select("document_id")
    .eq("id", bidId)
    .eq("subcontractor_id", sub.id)
    .single();
  if (!bid?.document_id) {
    return NextResponse.json({ error: "Bid document not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: document } = await admin
    .from("project_documents")
    .select("storage_path")
    .eq("id", bid.document_id)
    .single();
  if (!document) return NextResponse.json({ error: "Bid document not found" }, { status: 404 });

  const { data: signed, error } = await admin.storage
    .from("project-documents")
    .createSignedUrl(document.storage_path, 60);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not open bid document" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
