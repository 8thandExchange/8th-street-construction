import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MilestoneBoard, type MilestoneRow } from "@/components/project-hub/MilestoneBoard";

export const dynamic = "force-dynamic";

export default async function ProjectMilestonesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: milestones } = await supabase
    .from("project_milestones")
    .select("id, title, description, status, target_date, completed_at, display_order")
    .eq("project_id", id)
    .order("display_order", { ascending: true });

  return (
    <div>
      <h2 className="font-display text-2xl text-ink mb-2">Project Timeline</h2>
      <MilestoneBoard projectId={id} initial={(milestones ?? []) as MilestoneRow[]} />
    </div>
  );
}
