import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessageAttachment } from "@/lib/actions/messages";

export async function GET(
  _request: Request,
  context: { params: Promise<{ messageId: string; index: string }> }
) {
  const { messageId, index } = await context.params;
  const attachmentIndex = Number(index);
  if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS ensures the viewer can read this project's message.
  const { data: message } = await supabase
    .from("project_messages")
    .select("attachments")
    .eq("id", messageId)
    .single();
  const attachments = Array.isArray(message?.attachments)
    ? (message.attachments as unknown as MessageAttachment[])
    : [];
  const attachment = attachments[attachmentIndex];
  if (!attachment?.path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("project-documents")
    .createSignedUrl(attachment.path, 60);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not open attachment" }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
