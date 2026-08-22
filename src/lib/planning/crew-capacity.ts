/** Monday-aligned crew plan vs daily-log actuals. No timecards. */

export type CrewWeekStatus = "unplanned" | "on_plan" | "over" | "under" | "no_log";

export const CREW_WEEK_STATUS_LABELS: Record<CrewWeekStatus, string> = {
  unplanned: "No plan",
  on_plan: "On plan",
  over: "Over plan",
  under: "Under plan",
  no_log: "No log yet",
};

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isoWeekStart(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoWeekStart(new Date().toISOString().slice(0, 10));
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function weekEnd(weekStart: string): string {
  return addDays(isoWeekStart(weekStart), 6);
}

export function isMonday(isoDate: string): boolean {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay() === 1;
}

export function formatWeekLabel(weekStart: string): string {
  const start = isoWeekStart(weekStart);
  const end = weekEnd(start);
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const startDay = startDate.getUTCDate();
  const endDay = endDate.getUTCDate();
  if (startMonth === endMonth) return `${startMonth} ${startDay}–${endDay}`;
  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

export function parseCrewCount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function resolvePlannedCrew(
  weekPlan: number | null | undefined,
  defaultPlan: number | null | undefined
): number | null {
  if (weekPlan != null) return weekPlan;
  if (defaultPlan != null) return defaultPlan;
  return null;
}

export function actualCrewFromLogs(counts: Array<number | null | undefined>): {
  max: number | null;
  daysLogged: number;
  avg: number | null;
} {
  const nums = counts.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0);
  if (!nums.length) return { max: null, daysLogged: 0, avg: null };
  const max = Math.max(...nums);
  const avg = Math.round((nums.reduce((sum, n) => sum + n, 0) / nums.length) * 10) / 10;
  return { max, daysLogged: nums.length, avg };
}

export function crewWeekStatus(planned: number | null, actualMax: number | null): CrewWeekStatus {
  if (planned == null) return "unplanned";
  if (actualMax == null) return "no_log";
  if (actualMax > planned) return "over";
  if (actualMax < planned) return "under";
  return "on_plan";
}

export function sumPlanned(values: Array<number | null | undefined>): number {
  return values.reduce<number>((sum, n) => sum + (n ?? 0), 0);
}

export function currentPhaseTitle(
  milestones: Array<{ title: string | null; status: string | null; display_order?: number | null }>
): string | null {
  const inProgress = milestones.find((m) => m.status === "in_progress");
  if (inProgress?.title) return inProgress.title;
  const pending = milestones.find((m) => m.status === "pending" || m.status === "blocked");
  if (pending?.title) return pending.title;
  const completed = [...milestones].reverse().find((m) => m.status === "completed");
  return completed?.title ?? null;
}

export function personDisplayName(person: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null | undefined): string | null {
  if (!person) return null;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || person.email || null;
}

export function summarizeCrewBoard(jobs: Array<{ status: CrewWeekStatus; planned: number | null }>) {
  return {
    jobs: jobs.length,
    planned: sumPlanned(jobs.map((job) => job.planned)),
    unplanned: jobs.filter((job) => job.status === "unplanned").length,
    over: jobs.filter((job) => job.status === "over").length,
    under: jobs.filter((job) => job.status === "under").length,
    noLog: jobs.filter((job) => job.status === "no_log").length,
    onPlan: jobs.filter((job) => job.status === "on_plan").length,
  };
}
