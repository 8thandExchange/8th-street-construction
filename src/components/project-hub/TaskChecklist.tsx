"use client";

import { useState } from "react";
import { toggleTaskDone, deleteTask } from "@/lib/actions/tasks";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  phase_key: string | null;
  milestone_id: string | null;
  display_order: number;
};

export type PhaseGroup = {
  phaseKey: string;
  title: string;
  milestoneId: string | null;
  tasks: TaskRow[];
};

export function TaskChecklist({
  projectId,
  phases,
}: {
  projectId: string;
  phases: PhaseGroup[];
}) {
  const [openPhase, setOpenPhase] = useState<string | null>(phases[0]?.phaseKey ?? null);

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const done = phase.tasks.filter((t) => t.status === "done").length;
        const total = phase.tasks.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const isOpen = openPhase === phase.phaseKey;

        return (
          <section key={phase.phaseKey} className="border border-ink/15 bg-paper">
            <button
              type="button"
              onClick={() => setOpenPhase(isOpen ? null : phase.phaseKey)}
              className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-bone/50 transition-colors"
            >
              <div>
                <h3 className="font-display text-lg text-ink">{phase.title}</h3>
                <p className="text-xs font-mono text-stone-300 mt-1 uppercase tracking-wider">
                  {done}/{total} complete · {pct}%
                </p>
              </div>
              <div className="shrink-0 w-24 h-1.5 bg-bone overflow-hidden">
                <div className="h-full bg-copper transition-all" style={{ width: `${pct}%` }} />
              </div>
            </button>

            {isOpen && (
              <ul className="border-t border-ink/10 divide-y divide-ink/10">
                {phase.tasks.map((task) => (
                  <li key={task.id} className="flex gap-4 p-4 items-start group">
                    <form
                      action={async (fd) => {
                        await toggleTaskDone(fd);
                      }}
                      className="pt-0.5"
                    >
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="current_status" value={task.status} />
                      <button
                        type="submit"
                        className={`w-5 h-5 border flex items-center justify-center shrink-0 ${
                          task.status === "done"
                            ? "bg-copper border-copper text-bone"
                            : "border-ink/30 hover:border-copper"
                        }`}
                        aria-label={task.status === "done" ? "Mark incomplete" : "Mark complete"}
                      >
                        {task.status === "done" ? "✓" : ""}
                      </button>
                    </form>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm ${
                            task.status === "done" ? "text-stone-300 line-through" : "text-ink"
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.priority !== "normal" && (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-copper">
                            {task.priority}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-ink/55 mt-1 leading-relaxed">{task.description}</p>
                      )}
                    </div>
                    <form
                      action={async (fd) => {
                        await deleteTask(fd);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="project_id" value={projectId} />
                      <button
                        type="submit"
                        className="text-[10px] font-mono uppercase text-stone-300 hover:text-red-600"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
                {!phase.tasks.length && (
                  <li className="p-6 text-sm text-ink/50 italic">No tasks in this phase.</li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
