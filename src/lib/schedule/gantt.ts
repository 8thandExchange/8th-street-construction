import {
  daysBetween,
  resolveGanttDateRange,
  resolveMilestoneDates,
} from "./gantt-dates";

export type GanttMilestone = {
  id: string;
  title: string;
  status: string;
  /** Internal planning window (admin) */
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  /** Client-facing commitment date */
  target_date?: string | null;
  display_order?: number;
  /** Optional 0-100 completion from task rollup */
  progress?: number | null;
};

export type GanttBar = {
  id: string;
  title: string;
  status: string;
  startLabel: string | null;
  endLabel: string | null;
  /** % offset from left of the timeline (0-100) */
  left: number;
  /** % width of the bar (0-100) */
  width: number;
  /** completion fill inside the bar (0-100) */
  progress: number;
  hasDates: boolean;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

export type GanttModel = {
  bars: GanttBar[];
  months: { label: string; left: number; width: number }[];
  rangeStartLabel: string;
  rangeEndLabel: string;
  todayLeft: number | null;
  overallProgress: number;
  totalPhases: number;
  completedPhases: number;
};

function statusProgress(status: string, explicit?: number | null): number {
  if (typeof explicit === "number") return Math.max(0, Math.min(100, explicit));
  switch (status) {
    case "completed":
      return 100;
    case "in_progress":
      return 45;
    default:
      return 0;
  }
}

const DAY_LABEL: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const MONTH_LABEL: Intl.DateTimeFormatOptions = { month: "short", year: "2-digit" };

function formatDateLabel(date: Date | null) {
  return date ? date.toLocaleDateString("en-US", DAY_LABEL) : null;
}

function toIsoDate(date: Date | null) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build a normalized Gantt model from milestones.
 * `dateMode = "internal"` uses scheduled_start/end (admin); `"client"` uses target_date.
 */
export function buildGanttModel(
  milestones: GanttMilestone[],
  options: {
    projectStart?: string | null;
    projectEnd?: string | null;
    dateMode?: "internal" | "client";
    today?: Date;
  } = {}
): GanttModel {
  const { dateMode = "internal", today = new Date() } = options;
  const range = resolveGanttDateRange(milestones, options);
  const { minDate, maxDate, spanDays: span } = range;

  const resolved = milestones.map((m) => {
    const { start, end } = resolveMilestoneDates(m, dateMode);
    return { m, start, end: end ?? start };
  });

  const bars: GanttBar[] = resolved.map(({ m, start, end }) => {
    const hasDates = Boolean(start);
    const s = start ?? minDate;
    const e = end ?? s;
    const left = Math.min((daysBetween(minDate, s) / span) * 100, 99);
    const rawWidth = (daysBetween(s, e) / span) * 100;
    const width = Math.max(Math.min(rawWidth, 100 - left), hasDates ? 1.5 : 0);
    return {
      id: m.id,
      title: m.title,
      status: m.status,
      startLabel: formatDateLabel(start),
      endLabel:
        end && start && end.getTime() !== start.getTime() ? formatDateLabel(end) : null,
      left,
      width,
      progress: statusProgress(m.status, m.progress),
      hasDates,
      scheduled_start: toIsoDate(start),
      scheduled_end: toIsoDate(end),
    };
  });

  const months: GanttModel["months"] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const monthStart = new Date(cursor);
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const clampStart = monthStart < minDate ? minDate : monthStart;
    const clampEnd = nextMonth > maxDate ? maxDate : nextMonth;
    const left = (daysBetween(minDate, clampStart) / span) * 100;
    const width = (daysBetween(clampStart, clampEnd) / span) * 100;
    months.push({
      label: monthStart.toLocaleDateString("en-US", MONTH_LABEL),
      left: Math.max(left, 0),
      width: Math.max(width, 0),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayLeft =
    today >= minDate && today <= maxDate ? (daysBetween(minDate, today) / span) * 100 : null;

  const completedPhases = milestones.filter((m) => m.status === "completed").length;
  const totalPhases = milestones.length;
  const overallProgress = totalPhases
    ? Math.round(bars.reduce((sum, bar) => sum + bar.progress, 0) / totalPhases)
    : 0;

  return {
    bars,
    months,
    rangeStartLabel: minDate.toLocaleDateString("en-US", DAY_LABEL),
    rangeEndLabel: maxDate.toLocaleDateString("en-US", DAY_LABEL),
    todayLeft,
    overallProgress,
    totalPhases,
    completedPhases,
  };
}

export { resolveGanttDateRange } from "./gantt-dates";
