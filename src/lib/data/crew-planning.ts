import { createClient } from "@/lib/supabase/server";
import { parseStaffScope, staffCanSeeProject } from "@/lib/auth/staff-scope";
import {
  actualCrewFromLogs,
  crewWeekStatus,
  currentPhaseTitle,
  isoWeekStart,
  personDisplayName,
  resolvePlannedCrew,
  summarizeCrewBoard,
  weekEnd,
  type CrewWeekStatus,
} from "@/lib/planning/crew-capacity";

type ProfileName = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type CrewBoardJob = {
  id: string;
  title: string;
  status: string;
  location: string | null;
  planned: number | null;
  defaultCrew: number | null;
  weekPlan: number | null;
  notes: string | null;
  actualMax: number | null;
  daysLogged: number;
  phase: string | null;
  pmName: string | null;
  superName: string | null;
  weekStatus: CrewWeekStatus;
};

export type CrewBoard = {
  weekStart: string;
  weekEnd: string;
  jobs: CrewBoardJob[];
  totals: ReturnType<typeof summarizeCrewBoard>;
};

export async function loadCrewBoard(weekParam?: string | null): Promise<CrewBoard> {
  const supabase = await createClient();
  const weekStart = isoWeekStart(weekParam || new Date().toISOString().slice(0, 10));
  const end = weekEnd(weekStart);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("staff_scope").eq("id", user.id).single()
    : { data: null };
  const staffScope = parseStaffScope(profile?.staff_scope);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, location, planned_crew, project_manager_id, superintendent_id")
    .in("status", ["pre_construction", "in_progress"])
    .order("title");

  const visible = (projects ?? []).filter((project) =>
    user ? staffCanSeeProject(staffScope, user.id, project) : false
  );
  const projectIds = visible.map((project) => project.id);
  const staffIds = [
    ...new Set(
      visible.flatMap((project) => [project.project_manager_id, project.superintendent_id]).filter(Boolean)
    ),
  ] as string[];

  const [{ data: weeks }, { data: logs }, { data: milestones }, { data: staff }] = await Promise.all([
    projectIds.length
      ? supabase
          .from("project_crew_weeks")
          .select("project_id, planned_crew, notes")
          .eq("week_start", weekStart)
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_daily_logs")
          .select("project_id, log_date, crew_count")
          .in("project_id", projectIds)
          .gte("log_date", weekStart)
          .lte("log_date", end)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_milestones")
          .select("project_id, title, status, display_order")
          .in("project_id", projectIds)
          .order("display_order")
      : Promise.resolve({ data: [] }),
    staffIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, email").in("id", staffIds)
      : Promise.resolve({ data: [] as ProfileName[] }),
  ]);

  const staffById = new Map((staff ?? []).map((person) => [person.id, person]));
  const weekByProject = new Map((weeks ?? []).map((row) => [row.project_id, row]));

  const jobs: CrewBoardJob[] = visible.map((project) => {
    const week = weekByProject.get(project.id);
    const planned = resolvePlannedCrew(week?.planned_crew ?? null, project.planned_crew ?? null);
    const logCounts = (logs ?? [])
      .filter((log) => log.project_id === project.id)
      .map((log) => log.crew_count);
    const actual = actualCrewFromLogs(logCounts);
    const weekStatus = crewWeekStatus(planned, actual.max);
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      location: project.location,
      planned,
      defaultCrew: project.planned_crew ?? null,
      weekPlan: week?.planned_crew ?? null,
      notes: week?.notes ?? null,
      actualMax: actual.max,
      daysLogged: actual.daysLogged,
      phase: currentPhaseTitle(
        (milestones ?? []).filter((milestone) => milestone.project_id === project.id)
      ),
      pmName: personDisplayName(staffById.get(project.project_manager_id ?? "")),
      superName: personDisplayName(staffById.get(project.superintendent_id ?? "")),
      weekStatus,
    };
  });

  return {
    weekStart,
    weekEnd: end,
    jobs,
    totals: summarizeCrewBoard(jobs.map((job) => ({ status: job.weekStatus, planned: job.planned }))),
  };
}
