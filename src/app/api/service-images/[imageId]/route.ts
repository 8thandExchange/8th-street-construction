import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: image } = await supabase
    .from("project_service_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("project-documents")
    .createSignedUrl(image.storage_path, 60);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not open photo" }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
