"use client";

import { updateMilestoneSchedule, updateProjectSchedule } from "@/lib/actions/schedule";
import { MILESTONE_STATUS_STYLES, MILESTONE_STATUS_LABELS } from "@/lib/project/labels";

export type ScheduleMilestone = {
  id: string;
  title: string;
  status: string;
  target_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  display_order: number;
};

function parseDate(s: string | null) {
  if (!s) return null;
  return new Date(s + "T12:00:00");
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function ScheduleTimeline({
  projectId,
  projectStart,
  projectEnd,
  milestones,
}: {
  projectId: string;
  projectStart: string | null;
  projectEnd: string | null;
  milestones: ScheduleMilestone[];
}) {
  const dates = milestones.flatMap((m) =>
    [m.scheduled_start, m.scheduled_end, m.target_date].filter(Boolean) as string[]
  );
  if (projectStart) dates.push(projectStart);
  if (projectEnd) dates.push(projectEnd);

  const parsed = dates.map((d) => parseDate(d)!).filter(Boolean);
  const minDate =
    parsed.length > 0
      ? new Date(Math.min(...parsed.map((d) => d.getTime())))
      : new Date();
  const maxDate =
    parsed.length > 0
      ? new Date(Math.max(...parsed.map((d) => d.getTime())))
      : new Date(minDate.getTime() + 90 * 86400000);

  const span = Math.max(daysBetween(minDate, maxDate), 30);

  function barStyle(m: ScheduleMilestone) {
    const start = parseDate(m.scheduled_start || m.target_date) ?? minDate;
    const end = parseDate(m.scheduled_end || m.target_date) ?? start;
    const left = (daysBetween(minDate, start) / span) * 100;
    const width = Math.max((daysBetween(start, end) / span) * 100, 2);
    return { left: `${Math.min(left, 98)}%`, width: `${Math.min(width, 100 - left)}%` };
  }

  return (
    <div className="space-y-8">
      <form action={updateProjectSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border border-ink/15 bg-paper">
        <input type="hidden" name="project_id" value={projectId} />
        <div>
          <label className="field-label">Project start</label>
          <input type="date" name="start_date" defaultValue={projectStart ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Target completion</label>
          <input
            type="date"
            name="target_completion_date"
            defaultValue={projectEnd ?? ""}
            className="field-input"
          />
        </div>
        <button type="submit" className="md:col-span-2 h-10 px-4 bg-ink text-bone font-mono text-[10px] uppercase w-fit">
          Save project dates
        </button>
      </form>

      <div className="border border-ink/15 bg-paper overflow-x-auto">
        <div className="min-w-[640px] p-6">
          <div className="text-xs font-mono text-stone-300 mb-4 uppercase tracking-wider">
            {minDate.toLocaleDateString()} — {maxDate.toLocaleDateString()}
          </div>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.id} className="grid grid-cols-[180px_1fr] gap-4 items-center">
                <div>
                  <div className="text-sm font-medium text-ink truncate">{m.title}</div>
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 border ${MILESTONE_STATUS_STYLES[m.status]}`}
                  >
                    {MILESTONE_STATUS_LABELS[m.status]}
                  </span>
                </div>
                <div className="relative h-8 bg-bone/80">
                  {(m.scheduled_start || m.target_date) && (
                    <div
                      className="absolute top-1 bottom-1 bg-copper/80 rounded-sm"
                      style={barStyle(m)}
                      title={`${m.scheduled_start || m.target_date} → ${m.scheduled_end || m.target_date || ""}`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="eyebrow">Edit phase dates</h3>
        {milestones.map((m) => (
          <form
            key={m.id}
            action={updateMilestoneSchedule}
            className="p-5 border border-ink/15 bg-paper grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="id" value={m.id} />
            <div className="md:col-span-4 font-medium text-ink text-sm">{m.title}</div>
            <div>
              <label className="field-label">Start</label>
              <input type="date" name="scheduled_start" defaultValue={m.scheduled_start ?? ""} className="field-input" />
            </div>
            <div>
              <label className="field-label">End</label>
              <input type="date" name="scheduled_end" defaultValue={m.scheduled_end ?? ""} className="field-input" />
            </div>
            <div>
              <label className="field-label">Target (client)</label>
              <input type="date" name="target_date" defaultValue={m.target_date ?? ""} className="field-input" />
            </div>
            <button type="submit" className="h-10 px-4 border border-ink/25 font-mono text-[10px] uppercase">
              Update
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
