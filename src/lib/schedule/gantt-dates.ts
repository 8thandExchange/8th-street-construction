import type { GanttMilestone } from "./gantt";

export type GanttDateRange = {
  minDate: Date;
  maxDate: Date;
  spanDays: number;
};

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 86_400_000;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + Math.round(days));
  return next;
}

export function formatDateISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveMilestoneDates(
  milestone: GanttMilestone,
  dateMode: "internal" | "client"
) {
  const start =
    dateMode === "client"
      ? parseDate(milestone.target_date)
      : parseDate(milestone.scheduled_start) ?? parseDate(milestone.target_date);
  const end =
    dateMode === "client"
      ? parseDate(milestone.target_date)
      : parseDate(milestone.scheduled_end) ?? parseDate(milestone.target_date) ?? start;
  return { start, end: end ?? start };
}

export function resolveGanttDateRange(
  milestones: GanttMilestone[],
  options: {
    projectStart?: string | null;
    projectEnd?: string | null;
    dateMode?: "internal" | "client";
    today?: Date;
  } = {}
): GanttDateRange {
  const { projectStart, projectEnd, dateMode = "internal", today = new Date() } = options;

  const allDates: Date[] = [];
  for (const milestone of milestones) {
    const { start, end } = resolveMilestoneDates(milestone, dateMode);
    if (start) allDates.push(start);
    if (end) allDates.push(end);
  }

  const ps = parseDate(projectStart);
  const pe = parseDate(projectEnd);
  if (ps) allDates.push(ps);
  if (pe) allDates.push(pe);

  const minDate = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : new Date(today);
  const maxDateRaw = allDates.length
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : new Date(today.getTime() + 90 * 86_400_000);
  const maxDate =
    maxDateRaw.getTime() <= minDate.getTime()
      ? new Date(minDate.getTime() + 30 * 86_400_000)
      : maxDateRaw;

  return {
    minDate,
    maxDate,
    spanDays: Math.max(daysBetween(minDate, maxDate), 1),
  };
}

export function dateToPercent(date: Date, range: GanttDateRange) {
  return Math.min(Math.max((daysBetween(range.minDate, date) / range.spanDays) * 100, 0), 100);
}

export function percentToDate(percent: number, range: GanttDateRange) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return addDays(range.minDate, (clamped / 100) * range.spanDays);
}

export function pixelDeltaToDays(deltaPx: number, timelineWidthPx: number, range: GanttDateRange) {
  if (timelineWidthPx <= 0) return 0;
  return (deltaPx / timelineWidthPx) * range.spanDays;
}
