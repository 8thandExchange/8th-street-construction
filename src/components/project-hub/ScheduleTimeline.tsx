"use client";

import { updateMilestoneSchedule, updateProjectSchedule } from "@/lib/actions/schedule";

export type ScheduleMilestone = {
  id: string;
  title: string;
  status: string;
  target_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  display_order: number;
  predecessor_id?: string | null;
};

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
        <button type="submit" className="md:col-span-2 h-10 px-4 app-btn app-btn-primary">
          Save project dates
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="eyebrow">Edit phase dates</h3>
        {milestones.map((m) => (
          <form
            key={m.id}
            action={updateMilestoneSchedule}
            className="p-5 border border-ink/15 bg-paper grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
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
            <div>
              <label className="field-label">Depends on</label>
              <select
                name="predecessor_id"
                defaultValue={m.predecessor_id ?? ""}
                className="field-input"
              >
                <option value="">None</option>
                {milestones
                  .filter((option) => option.id !== m.id)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
              </select>
            </div>
            <button type="submit" className="h-10 px-4 app-btn app-btn-secondary">
              Update
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
