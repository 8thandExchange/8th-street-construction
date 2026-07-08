import type { GanttMilestone } from "./gantt";
import { daysBetween, resolveMilestoneDates } from "./gantt-dates";

export type PhaseVariance = {
  id: string;
  title: string;
  /** Whole days past the phase's client-facing end date */
  daysLate: number;
};

export type ScheduleHealth = {
  state: "complete" | "on_track" | "watch" | "behind" | "unscheduled";
  /** Incomplete phases whose end date has passed, worst first */
  latePhases: PhaseVariance[];
  worstDaysLate: number;
  blockedCount: number;
  /** The phase currently underway (in_progress, or window covering today) */
  current: { id: string; title: string } | null;
  /** The next phase that hasn't started yet */
  nextUp: {
    id: string;
    title: string;
    dateLabel: string;
    daysUntil: number;
  } | null;
};

function fmt(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Judge whether the build is tracking to its committed dates.
 * Purely derived — a phase is "late" when its client-facing end date has
 * passed and the phase isn't complete.
 */
export function computeScheduleHealth(
  milestones: GanttMilestone[],
  options: { dateMode?: "internal" | "client"; today?: Date } = {}
): ScheduleHealth {
  const dateMode = options.dateMode ?? "client";
  const today = options.today ?? new Date();
  today.setHours(12, 0, 0, 0);

  const latePhases: PhaseVariance[] = [];
  let blockedCount = 0;
  let current: ScheduleHealth["current"] = null;
  let nextUp: ScheduleHealth["nextUp"] = null;
  let hasAnyDate = false;

  for (const m of milestones) {
    if (m.status === "blocked") blockedCount += 1;
    const { start, end } = resolveMilestoneDates(m, dateMode);
    if (start || end) hasAnyDate = true;

    if (m.status !== "completed" && end && end < today) {
      const daysLate = Math.max(1, Math.floor(daysBetween(end, today)));
      latePhases.push({ id: m.id, title: m.title, daysLate });
    }

    if (!current) {
      if (m.status === "in_progress") {
        current = { id: m.id, title: m.title };
      } else if (
        m.status !== "completed" &&
        start &&
        end &&
        start <= today &&
        end >= today
      ) {
        current = { id: m.id, title: m.title };
      }
    }

    if (!nextUp && m.status === "pending" && start && start > today) {
      nextUp = {
        id: m.id,
        title: m.title,
        dateLabel: fmt(start),
        daysUntil: Math.max(1, Math.ceil(daysBetween(today, start))),
      };
    }
  }

  latePhases.sort((a, b) => b.daysLate - a.daysLate);
  const worstDaysLate = latePhases[0]?.daysLate ?? 0;

  let state: ScheduleHealth["state"];
  if (milestones.length && milestones.every((m) => m.status === "completed")) {
    state = "complete";
  } else if (!hasAnyDate) {
    state = "unscheduled";
  } else if (worstDaysLate >= 5) {
    state = "behind";
  } else if (worstDaysLate > 0 || blockedCount > 0) {
    state = "watch";
  } else {
    state = "on_track";
  }

  return { state, latePhases, worstDaysLate, blockedCount, current, nextUp };
}
