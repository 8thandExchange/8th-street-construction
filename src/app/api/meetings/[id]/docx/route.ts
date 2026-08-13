import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMeetingDetail } from "@/lib/meetings/queries";
import { minutesDocxFilename, renderMinutesDocx } from "@/lib/meetings/minutes-docx";

export const dynamic = "force-dynamic";

/** Admin-only Word download of the meeting minutes. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const detail = await getMeetingDetail(supabase, id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderMinutesDocx(detail);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${minutesDocxFilename(detail.meeting)}"`,
      "Cache-Control": "no-store",
    },
  });
}
