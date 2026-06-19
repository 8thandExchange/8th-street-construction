import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchResult = {
  type: "project" | "lead" | "consultation";
  id: string;
  label: string;
  sublabel: string;
  href: string;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const like = `%${q.replace(/[%_]/g, "")}%`;

  const [projects, leads, consultations] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, slug, status")
      .or(`title.ilike.${like},slug.ilike.${like}`)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("leads")
      .select("id, first_name, last_name, email, status")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("consultations")
      .select("id, first_name, last_name, email")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const results: SearchResult[] = [];

  for (const p of projects.data ?? []) {
    results.push({
      type: "project",
      id: p.id,
      label: p.title,
      sublabel: `Job · ${String(p.status).replace(/_/g, " ")}`,
      href: `/admin/projects/${p.id}`,
    });
  }
  for (const l of leads.data ?? []) {
    const name = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
    results.push({
      type: "lead",
      id: l.id,
      label: name || l.email,
      sublabel: `Lead · ${l.email}`,
      href: `/admin/leads/${l.id}`,
    });
  }
  for (const c of consultations.data ?? []) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    results.push({
      type: "consultation",
      id: c.id,
      label: name || c.email,
      sublabel: `Consultation · ${c.email}`,
      href: `/admin/consultations`,
    });
  }

  return NextResponse.json({ results });
}
