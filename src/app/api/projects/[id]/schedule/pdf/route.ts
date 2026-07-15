import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadGanttMilestones } from "@/lib/schedule/load-gantt-milestones";
import { computeScheduleHealth } from "@/lib/schedule/health";
import { buildGanttModel } from "@/lib/schedule/gantt";
import { renderSchedulePdf } from "@/lib/schedule/schedule-pdf";
import { isFeatureEnabled } from "@/lib/portal/features";

export const dynamic = "force-dynamic";

const HEALTH_LABELS: Record<string, string> = {
  on_track: "On track",
  watch: "Needs attention",
  behind: "Behind schedule",
  complete: "All phases complete",
  unscheduled: "Dates pending",
};

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtIso = (s: string | null | undefined) => (s ? fmt(new Date(`${s}T12:00:00`)) : null);

/**
 * Downloadable build-schedule PDF. Same access rules as /print/schedule/[id]:
 * admins always; the project's client when their schedule feature is enabled.
 * ?dates=internal (admin only) uses the planning window instead of client
 * commitment dates; ?download=1 forces a file download instead of inline view.
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, slug, street_address, location, start_date, target_completion_date, client_id, portal_features"
    )
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const isProjectClient = project.client_id === user.id;
  if (!isAdmin && !isProjectClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isProjectClient && !isFeatureEnabled(project.portal_features, "schedule")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const dateMode = isAdmin && url.searchParams.get("dates") === "internal" ? "internal" : "client";

  const milestones = await loadGanttMilestones(supabase, id);
  if (!milestones.length) {
    return NextResponse.json(
      { error: "No schedule yet — add milestones or apply a build playbook first." },
      { status: 404 }
    );
  }

  const model = buildGanttModel(milestones, {
    projectStart: project.start_date,
    projectEnd: project.target_completion_date,
    dateMode,
  });
  const health = computeScheduleHealth(milestones, { dateMode: "client" });

  const buffer = await renderSchedulePdf({
    projectTitle: project.title,
    addressLine:
      [project.street_address, project.location].filter(Boolean).join(", ") || null,
    healthLabel: HEALTH_LABELS[health.state] ?? "—",
    printedOn: fmt(new Date()),
    startLabel: fmtIso(project.start_date) ?? model.rangeStartLabel,
    endLabel: fmtIso(project.target_completion_date) ?? model.rangeEndLabel,
    model,
    volunteerIds: new Set(
      milestones.filter((m) => m.volunteer_friendly).map((m) => m.id)
    ),
  });

  const filename = `${project.slug || "project"}-schedule.pdf`;
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
