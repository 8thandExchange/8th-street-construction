import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: file } = await supabase
    .from("project_plan_files")
    .select("storage_path, title, plan_set_id")
    .eq("id", id)
    .single();

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("project-documents")
    .createSignedUrl(file.storage_path, 3600);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
