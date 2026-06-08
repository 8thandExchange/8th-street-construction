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

  const { data: plan } = await supabase
    .from("house_base_plans")
    .select("storage_path, name, plan_number")
    .eq("id", id)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("project-documents")
    .createSignedUrl(plan.storage_path, 3600);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
