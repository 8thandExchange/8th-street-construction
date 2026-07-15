"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { updateMilestoneDates } from "@/lib/actions/schedule";
import { buildGanttModel, type GanttMilestone } from "@/lib/schedule/gantt";
import { GanttDependencyLines } from "@/components/schedule/GanttDependencyLines";
import {
  addDays,
  formatDateISO,
  pixelDeltaToDays,
  resolveGanttDateRange,
  resolveMilestoneDates,
} from "@/lib/schedule/gantt-dates";
import { MILESTONE_STATUS_LABELS } from "@/lib/project/labels";
import { appStatusBadge } from "@/lib/project/status-badges";

type InteractiveScheduleGanttProps = {
  projectId: string;
  milestones: GanttMilestone[];
  projectStart?: string | null;
  projectEnd?: string | null;
  title?: string;
  subtitle?: string;
};

type DragMode = "move" | "resize-start" | "resize-end";

type DragState = {
  barId: string;
  mode: DragMode;
  pointerId: number;
  startX: number;
  origStart: Date;
  origEnd: Date;
};

type LocalDates = {
  scheduled_start: string | null;
  scheduled_end: string | null;
};

const BAR_TONES: Record<string, { track: string; fill: string; dot: string; ring: string }> = {
  completed: {
    track: "bg-emerald-500/25",
    fill: "bg-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-600/20",
  },
  in_progress: {
    track: "bg-copper/20",
    fill: "bg-copper",
    dot: "bg-copper",
    ring: "ring-copper/25",
  },
  blocked: {
    track: "bg-amber-400/25",
    fill: "bg-amber-400",
    dot: "bg-amber-400",
    ring: "ring-amber-500/25",
  },
  pending: {
    track: "bg-stone-300/50",
    fill: "bg-stone-400",
    dot: "bg-stone-300",
    ring: "ring-stone-400/20",
  },
};

const TIMELINE_MIN_WIDTH = 680;
const PHASE_COL_WIDTH = 240;
const ROW_HEIGHT = 72;

function toneFor(status: string) {
  return BAR_TONES[status] ?? BAR_TONES.pending;
}

function fmtShort(date: string | null) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function InteractiveScheduleGantt({
  projectId,
  milestones,
  projectStart,
  projectEnd,
  title = "Build schedule",
  subtitle,
}: InteractiveScheduleGanttProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [localDates, setLocalDates] = useState<Map<string, LocalDates>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!drag) {
      setLocalDates(new Map());
    }
  }, [milestones]);

  const effectiveMilestones = useMemo(() => {
    return milestones.map((milestone) => {
      const override = localDates.get(milestone.id);
      if (!override) return milestone;
      return {
        ...milestone,
        scheduled_start: override.scheduled_start,
        scheduled_end: override.scheduled_end,
      };
    });
  }, [milestones, localDates]);

  const dateRange = useMemo(
    () =>
      resolveGanttDateRange(effectiveMilestones, {
        projectStart,
        projectEnd,
        dateMode: "internal",
      }),
    [effectiveMilestones, projectStart, projectEnd]
  );

  const computeDraggedDates = useCallback(
    (state: DragState, clientX: number) => {
      const timeline = timelineRef.current;
      if (!timeline) {
        return {
          scheduled_start: formatDateISO(state.origStart),
          scheduled_end: formatDateISO(state.origEnd),
        };
      }

      const deltaDays = pixelDeltaToDays(clientX - state.startX, timeline.clientWidth, dateRange);
      let nextStart = new Date(state.origStart);
      let nextEnd = new Date(state.origEnd);

      if (state.mode === "move") {
        nextStart = addDays(state.origStart, deltaDays);
        nextEnd = addDays(state.origEnd, deltaDays);
      } else if (state.mode === "resize-start") {
        nextStart = addDays(state.origStart, deltaDays);
        if (nextStart >= nextEnd) nextStart = addDays(nextEnd, -1);
      } else {
        nextEnd = addDays(state.origEnd, deltaDays);
        if (nextEnd <= nextStart) nextEnd = addDays(nextStart, 1);
      }

      return {
        scheduled_start: formatDateISO(nextStart),
        scheduled_end: formatDateISO(nextEnd),
      };
    },
    [dateRange]
  );

  const model = useMemo(
    () =>
      buildGanttModel(effectiveMilestones, {
        projectStart,
        projectEnd,
        dateMode: "internal",
      }),
    [effectiveMilestones, projectStart, projectEnd]
  );

  const persistDates = useCallback(
    (milestoneId: string, scheduled_start: string | null, scheduled_end: string | null) => {
      startTransition(async () => {
        try {
          setError(null);
          await updateMilestoneDates({
            projectId,
            milestoneId,
            scheduled_start,
            scheduled_end,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save schedule change.");
          setLocalDates(new Map());
        }
      });
    },
    [projectId]
  );

  const applyDragDelta = useCallback(
    (state: DragState, clientX: number) => {
      const timeline = timelineRef.current;
      if (!timeline) return;

      const deltaPx = clientX - state.startX;
      const deltaDays = pixelDeltaToDays(deltaPx, timeline.clientWidth, dateRange);
      let nextStart = new Date(state.origStart);
      let nextEnd = new Date(state.origEnd);

      if (state.mode === "move") {
        nextStart = addDays(state.origStart, deltaDays);
        nextEnd = addDays(state.origEnd, deltaDays);
      } else if (state.mode === "resize-start") {
        nextStart = addDays(state.origStart, deltaDays);
        if (nextStart >= nextEnd) nextStart = addDays(nextEnd, -1);
      } else {
        nextEnd = addDays(state.origEnd, deltaDays);
        if (nextEnd <= nextStart) nextEnd = addDays(nextStart, 1);
      }

      setLocalDates((current) => {
        const next = new Map(current);
        next.set(state.barId, {
          scheduled_start: formatDateISO(nextStart),
          scheduled_end: formatDateISO(nextEnd),
        });
        return next;
      });
    },
    [dateRange]
  );

  useEffect(() => {
    if (!drag) return;

    const activeDrag = drag;

    function onMove(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      applyDragDelta(activeDrag, event.clientX);
    }

    function onUp(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;

      const { scheduled_start, scheduled_end } = computeDraggedDates(activeDrag, event.clientX);
      if (scheduled_start && scheduled_end) {
        persistDates(activeDrag.barId, scheduled_start, scheduled_end);
      }

      setDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [applyDragDelta, computeDraggedDates, drag, persistDates]);

  function beginDrag(
    barId: string,
    mode: DragMode,
    event: React.PointerEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    const milestone = milestones.find((item) => item.id === barId);
    if (!milestone) return;

    const { start, end } = resolveMilestoneDates(milestone, "internal");
    if (!start || !end) return;

    setSelectedId(barId);
    setDrag({
      barId,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      origStart: start,
      origEnd: end,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  if (!milestones.length) {
    return (
      <div className="hub-panel p-10 text-center">
        <p className="font-display text-lg text-ink/70">No schedule yet</p>
        <p className="mt-2 text-sm text-ink/45 max-w-sm mx-auto leading-relaxed">
          Phases will appear here as the build plan is set up.
        </p>
      </div>
    );
  }

  return (
    <section className="relative isolate overflow-hidden border border-ink/10 bg-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-copper via-copper/40 to-transparent" />

      <div className="px-6 md:px-8 pt-7 pb-5 flex flex-wrap items-end justify-between gap-5 border-b border-ink/8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
            Interactive schedule
          </p>
          <h3 className="mt-1 font-display text-xl md:text-2xl text-ink tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
          <p className="mt-2 text-xs text-ink/45">
            Drag bars to move phases. Drag edges to adjust duration. Clients see target dates in
            their portal.
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-ink leading-none">{model.overallProgress}%</div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-stone-400">
            {model.completedPhases} of {model.totalPhases} phases complete
          </p>
        </div>
      </div>

      <div className="px-6 md:px-8 pt-5">
        <div className="h-1.5 w-full bg-ink/[0.06] overflow-hidden rounded-full">
          <div
            className="h-full bg-copper rounded-full transition-all duration-700"
            style={{ width: `${model.overallProgress}%` }}
          />
        </div>
      </div>

      {(pending || drag) && (
        <div className="px-6 md:px-8 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-copper">
            {drag ? "Dragging…" : "Saving schedule…"}
          </p>
        </div>
      )}

      {error && (
        <div className="px-6 md:px-8 pt-3">
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2">{error}</p>
        </div>
      )}

      <div className="mt-4 border-t border-ink/8">
        <div className="flex">
          <div
            className="shrink-0 border-r border-ink/10 bg-white"
            style={{ width: PHASE_COL_WIDTH }}
          >
            <div className="h-11 px-4 flex items-end pb-2 border-b border-ink/10">
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
                Phase
              </span>
            </div>
            {model.bars.map((bar, idx) => {
              const tone = toneFor(bar.status);
              const active = selectedId === bar.id;
              return (
                <button
                  key={bar.id}
                  type="button"
                  onClick={() => setSelectedId(bar.id)}
                  style={{ height: ROW_HEIGHT }}
                  className={`block w-full text-left px-4 border-b border-ink/[0.06] transition-colors ${
                    active ? "bg-copper/[0.06]" : idx % 2 ? "bg-ink/[0.015] hover:bg-ink/[0.03]" : "hover:bg-ink/[0.02]"
                  }`}
                >
                  <div className="flex h-full flex-col justify-center gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                      <p className="text-[13px] font-medium text-ink truncate">{bar.title}</p>
                    </div>
                    <div className="flex items-center gap-2 pl-4 min-w-0">
                      <span
                        className={`shrink-0 !h-[18px] !px-2 !text-[11px] ${appStatusBadge("milestone", bar.status)}`}
                      >
                        {MILESTONE_STATUS_LABELS[bar.status] ?? bar.status}
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 truncate">
                        {bar.hasDates ? (
                          <>
                            {fmtShort(bar.scheduled_start)}
                            {bar.scheduled_end && bar.scheduled_end !== bar.scheduled_start
                              ? ` → ${fmtShort(bar.scheduled_end)}`
                              : ""}
                            {bar.durationDays ? ` · ${bar.durationDays}d` : ""}
                            {bar.progress > 0 && (
                              <span className="text-copper"> · {bar.progress}%</span>
                            )}
                          </>
                        ) : (
                          "Date TBD"
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 overflow-x-auto" ref={timelineRef}>
            <div style={{ minWidth: TIMELINE_MIN_WIDTH }}>
              <div className="relative h-11 border-b border-ink/10 bg-white">
                {model.months.map((month, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-6 border-l border-ink/10 flex items-center overflow-hidden"
                    style={{ left: `${month.left}%`, width: `${month.width}%` }}
                  >
                    <span className="w-full text-center font-mono text-[9px] uppercase tracking-wider text-ink/60 whitespace-nowrap">
                      {month.label}
                    </span>
                  </div>
                ))}
                {model.weeks.map((week, index) => (
                  <div
                    key={`w${index}`}
                    className="absolute bottom-0 h-5 border-l border-ink/[0.07] pl-0.5 flex items-center"
                    style={{ left: `${week.left}%` }}
                  >
                    <span className="font-mono text-[8px] text-stone-400">{week.label}</span>
                  </div>
                ))}
                {model.todayLeft != null && (
                  <span
                    className="absolute bottom-0 translate-x-[-50%] rounded-sm bg-rust px-1 py-px font-mono text-[8px] font-semibold uppercase tracking-wide text-white z-10"
                    style={{ left: `${model.todayLeft}%` }}
                  >
                    Today
                  </span>
                )}
              </div>

              <div className="relative">
                <GanttDependencyLines bars={model.bars} rowHeight={ROW_HEIGHT} />
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                  {model.weeks.map((week, index) => (
                    <div
                      key={`w${index}`}
                      className="absolute top-0 bottom-0 border-l border-ink/[0.04]"
                      style={{ left: `${week.left}%` }}
                    />
                  ))}
                  {model.months.map((month, index) => (
                    <div
                      key={index}
                      className="absolute top-0 bottom-0 border-l border-ink/10"
                      style={{ left: `${month.left}%` }}
                    />
                  ))}
                  {model.todayLeft != null && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-rust/80 z-10"
                      style={{ left: `${model.todayLeft}%` }}
                    />
                  )}
                </div>

                {model.bars.map((bar, idx) => {
                  const tone = toneFor(bar.status);
                  const active = selectedId === bar.id;
                  const isDragging = drag?.barId === bar.id;

                  return (
                    <div
                      key={bar.id}
                      className={`relative h-[72px] border-b border-ink/[0.06] ${
                        active ? "bg-copper/[0.03]" : idx % 2 ? "bg-ink/[0.015]" : ""
                      }`}
                    >
                      <div className="absolute inset-y-0 left-0 right-0 px-1">
                        {bar.hasDates ? (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-[5px] overflow-visible ring-1 ring-inset ${tone.ring} ${tone.track} ${
                              isDragging ? "ring-2 ring-copper/50 shadow-md z-20" : "z-10"
                            }`}
                            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                          >
                            <div
                              className={`absolute inset-y-0 left-0 ${tone.fill} rounded-l-[5px] pointer-events-none ${
                                bar.progress >= 100 ? "rounded-r-[5px]" : ""
                              }`}
                              style={{ width: `${bar.progress}%` }}
                            />
                            <div
                              className="absolute inset-y-0 left-0 w-2 cursor-ew-resize z-30"
                              onPointerDown={(event) => beginDrag(bar.id, "resize-start", event)}
                              aria-label={`Resize start of ${bar.title}`}
                            />
                            <div
                              className="absolute inset-y-0 right-0 w-2 cursor-ew-resize z-30"
                              onPointerDown={(event) => beginDrag(bar.id, "resize-end", event)}
                              aria-label={`Resize end of ${bar.title}`}
                            />
                            <div
                              className="absolute inset-0 cursor-grab active:cursor-grabbing z-20"
                              onPointerDown={(event) => beginDrag(bar.id, "move", event)}
                              title={`${bar.startLabel ?? ""}${
                                bar.endLabel ? ` → ${bar.endLabel}` : ""
                              }`}
                            >
                              <div className="relative h-full flex items-center justify-between gap-2 px-2.5 pointer-events-none">
                                <span className="font-mono text-[9px] tracking-wide text-ink/70 whitespace-nowrap truncate">
                                  {bar.startLabel}
                                  {bar.endLabel ? ` – ${bar.endLabel}` : ""}
                                </span>
                                {bar.progress > 0 && bar.progress < 100 && bar.width >= 9 && (
                                  <span className="font-mono text-[9px] font-semibold text-ink/60 whitespace-nowrap">
                                    {bar.progress}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-y-0 left-0 flex items-center px-2">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-300">
                              Set dates below or use AI schedule
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-4 border-t border-ink/8 flex flex-wrap items-center gap-x-6 gap-y-2">
        {[
          { label: "Complete", cls: "bg-emerald-500" },
          { label: "In progress", cls: "bg-copper" },
          { label: "Blocked", cls: "bg-amber-400" },
          { label: "Upcoming", cls: "bg-stone-300" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-2 text-xs text-ink/55">
            <span className={`w-3.5 h-2.5 rounded-[3px] ${item.cls}`} aria-hidden />
            {item.label}
          </span>
        ))}
        {model.todayLeft != null && (
          <span className="flex items-center gap-2 text-xs text-ink/55">
            <span className="w-[2px] h-3 bg-rust/80" aria-hidden />
            Today
          </span>
        )}
        <span className="flex items-center gap-2 text-xs text-ink/55">
          <span className="w-4 h-2 rounded-[3px] bg-copper/20 ring-1 ring-inset ring-copper/25" aria-hidden />
          Checklist progress fill
        </span>
        <span className="flex items-center gap-2 text-xs text-ink/55">
          <span className="w-4 h-0.5 bg-ink/25" aria-hidden />
          Dependency
        </span>
      </div>
    </section>
  );
}
