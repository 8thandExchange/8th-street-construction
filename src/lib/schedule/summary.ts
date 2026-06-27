import type { GanttMilestone } from "./gantt";
import { buildGanttModel } from "./gantt";
import { resolveMilestoneDates } from "./gantt-dates";

export type WeekAgendaItem = {
  id: string;
  title: string;
  kind: "starts" | "ends" | "active";
  dateLabel: string;
  status: string;
};

export type ScheduleSummary = {
  totalPhases: number;
  completedPhases: number;
  inProgressPhases: number;
  blockedPhases: number;
  overallProgress: number;
  daysRemaining: number | null;
  phasesThisWeek: WeekAgendaItem[];
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function fmtAgendaDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function computeScheduleSummary(
  milestones: GanttMilestone[],
  options: {
    projectStart?: string | null;
    projectEnd?: string | null;
    dateMode?: "internal" | "client";
    today?: Date;
  } = {}
): ScheduleSummary {
  const today = options.today ?? new Date();
  const model = buildGanttModel(milestones, options);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  const phasesThisWeek: WeekAgendaItem[] = [];

  for (const milestone of milestones) {
    const { start, end } = resolveMilestoneDates(milestone, options.dateMode ?? "internal");
    const dates = [
      { kind: "starts" as const, date: start },
      { kind: "ends" as const, date: end },
    ];

    for (const entry of dates) {
      if (!entry.date) continue;
      if (entry.date >= weekStart && entry.date <= weekEnd) {
        phasesThisWeek.push({
          id: `${milestone.id}-${entry.kind}`,
          title: milestone.title,
          kind: entry.kind,
          dateLabel: fmtAgendaDate(entry.date),
          status: milestone.status,
        });
      }
    }

    if (
      start &&
      end &&
      start <= today &&
      end >= today &&
      milestone.status !== "completed" &&
      !phasesThisWeek.some((item) => item.id.startsWith(milestone.id))
    ) {
      phasesThisWeek.push({
        id: `${milestone.id}-active`,
        title: milestone.title,
        kind: "active",
        dateLabel: "In progress this week",
        status: milestone.status,
      });
    }
  }

  phasesThisWeek.sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));

  const projectEnd = parseDate(options.projectEnd);
  const daysRemaining =
    projectEnd && projectEnd >= today
      ? Math.ceil((projectEnd.getTime() - today.getTime()) / 86_400_000)
      : null;

  return {
    totalPhases: model.totalPhases,
    completedPhases: model.completedPhases,
    inProgressPhases: milestones.filter((milestone) => milestone.status === "in_progress").length,
    blockedPhases: milestones.filter((milestone) => milestone.status === "blocked").length,
    overallProgress: model.overallProgress,
    daysRemaining,
    phasesThisWeek,
  };
}
