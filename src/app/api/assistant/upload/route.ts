import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_BYTES,
  STAGING_PREFIX,
} from "@/lib/assistant/attachments";

export const dynamic = "force-dynamic";

/**
 * Stages a chat attachment in the project-documents bucket under
 * assistant-inbox/. The assistant reads it from there and, on approval,
 * file_document moves it into the target project's folder.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and image files (PNG, JPG, WEBP, GIF) are supported." },
      { status: 400 }
    );
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { error: `File is too large — the limit is ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB.` },
      { status: 400 }
    );
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${STAGING_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    storage_path: path,
    file_name: file.name,
    media_type: file.type,
    file_size: file.size,
  });
}
