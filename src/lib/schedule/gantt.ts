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

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 86_400_000;
}

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
  const { projectStart, projectEnd, dateMode = "internal", today = new Date() } = options;

  const resolved = milestones.map((m) => {
    const start =
      dateMode === "client"
        ? parseDate(m.target_date)
        : parseDate(m.scheduled_start) ?? parseDate(m.target_date);
    const end =
      dateMode === "client"
        ? parseDate(m.target_date)
        : parseDate(m.scheduled_end) ?? parseDate(m.target_date) ?? start;
    return { m, start, end: end ?? start };
  });

  const allDates: Date[] = [];
  for (const r of resolved) {
    if (r.start) allDates.push(r.start);
    if (r.end) allDates.push(r.end);
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

  const span = Math.max(daysBetween(minDate, maxDate), 1);

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
      startLabel: start ? start.toLocaleDateString("en-US", DAY_LABEL) : null,
      endLabel: end && end.getTime() !== (start?.getTime() ?? -1)
        ? end.toLocaleDateString("en-US", DAY_LABEL)
        : null,
      left,
      width,
      progress: statusProgress(m.status, m.progress),
      hasDates,
    };
  });

  // Month gridlines
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
    ? Math.round(bars.reduce((s, b) => s + b.progress, 0) / totalPhases)
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
