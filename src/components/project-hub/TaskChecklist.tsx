"use client";

import { useState } from "react";
import { toggleTaskDone, deleteTask, createTask, updateTask } from "@/lib/actions/tasks";
import { CUSTOM_PHASE_KEY } from "@/lib/build/task-phases";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  phase_key: string | null;
  milestone_id: string | null;
  display_order: number;
  is_custom?: boolean;
  due_date?: string | null;
};

export type PhaseGroup = {
  phaseKey: string;
  title: string;
  milestoneId: string | null;
  tasks: TaskRow[];
  allowAdd?: boolean;
  hint?: string;
};

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "normal") return null;
  return (
    <span className="text-[9px] font-mono uppercase tracking-wider text-copper">{priority}</span>
  );
}

function AddTaskForm({
  projectId,
  phaseKey,
  milestoneId,
}: {
  projectId: string;
  phaseKey: string;
  milestoneId: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full p-4 text-left text-sm font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:bg-bone/60 transition-colors"
      >
        + Add task to this phase
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await createTask(fd);
        setOpen(false);
      }}
      className="p-4 bg-bone/40 border-t border-ink/10 space-y-3"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="phase_key" value={phaseKey} />
      {milestoneId && <input type="hidden" name="milestone_id" value={milestoneId} />}
      <input
        name="title"
        required
        placeholder="Task title — e.g. Coordinate tree removal with neighbor"
        className="field-input text-sm"
        autoFocus
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Notes (optional)"
        className="field-input text-sm"
      />
      <div className="flex flex-wrap gap-3">
        <select name="priority" defaultValue="normal" className="field-input text-sm w-auto">
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>
        <input type="date" name="due_date" className="field-input text-sm w-auto" />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="h-9 px-4 bg-ink text-bone font-mono text-[10px] uppercase tracking-wider"
        >
          Add Task
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 px-4 border border-ink/20 font-mono text-[10px] uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TaskRowItem({
  task,
  projectId,
  phaseOptions,
}: {
  task: TaskRow;
  projectId: string;
  phaseOptions: { key: string; label: string; milestoneId: string | null }[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex gap-4 p-4 items-start group border-b border-ink/5 last:border-0">
      <form action={toggleTaskDone} className="pt-0.5">
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
        {editing ? (
          <form
            action={async (fd) => {
              await updateTask(fd);
              setEditing(false);
            }}
            className="space-y-2"
          >
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="project_id" value={projectId} />
            <input name="title" defaultValue={task.title} required className="field-input text-sm" />
            <textarea
              name="description"
              rows={2}
              defaultValue={task.description ?? ""}
              className="field-input text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <select
                name="priority"
                defaultValue={task.priority}
                className="field-input text-sm w-auto"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
              <input
                type="date"
                name="due_date"
                defaultValue={task.due_date ?? ""}
                className="field-input text-sm w-auto"
              />
              {phaseOptions.length > 1 && (
                <select
                  name="phase_key"
                  defaultValue={task.phase_key ?? CUSTOM_PHASE_KEY}
                  className="field-input text-sm"
                >
                  {phaseOptions.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="h-8 px-3 bg-ink text-bone font-mono text-[10px] uppercase"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-8 px-3 border border-ink/20 font-mono text-[10px] uppercase"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-sm ${
                  task.status === "done" ? "text-stone-300 line-through" : "text-ink"
                }`}
              >
                {task.title}
              </span>
              {task.is_custom && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-ink/40 border border-ink/15 px-1.5 py-0.5">
                  Custom
                </span>
              )}
              <PriorityBadge priority={task.priority} />
              {task.due_date && (
                <span className="text-[9px] font-mono text-stone-300">Due {task.due_date}</span>
              )}
            </div>
            {task.description && (
              <p className="text-xs text-ink/55 mt-1 leading-relaxed">{task.description}</p>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-[10px] font-mono uppercase text-stone-300 hover:text-copper opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Edit
            </button>
          </>
        )}
      </div>

      <form action={deleteTask} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="project_id" value={projectId} />
        <button
          type="submit"
          className="text-[10px] font-mono uppercase text-stone-300 hover:text-red-600"
          title="Delete task"
        >
          ×
        </button>
      </form>
    </li>
  );
}

export function TaskChecklist({
  projectId,
  phases,
}: {
  projectId: string;
  phases: PhaseGroup[];
}) {
  const [openPhase, setOpenPhase] = useState<string | null>(phases[0]?.phaseKey ?? null);

  const phaseOptions = phases.map((p) => ({
    key: p.phaseKey,
    label: p.title,
    milestoneId: p.milestoneId,
  }));

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const done = phase.tasks.filter((t) => t.status === "done").length;
        const total = phase.tasks.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const isOpen = openPhase === phase.phaseKey;
        const allowAdd = phase.allowAdd !== false;

        return (
          <section key={phase.phaseKey} className="border border-ink/15 bg-paper">
            <button
              type="button"
              onClick={() => setOpenPhase(isOpen ? null : phase.phaseKey)}
              className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-bone/50 transition-colors"
            >
              <div>
                <h3 className="font-display text-lg text-ink">{phase.title}</h3>
                {phase.hint && (
                  <p className="text-xs text-ink/50 mt-1 max-w-lg">{phase.hint}</p>
                )}
                <p className="text-xs font-mono text-stone-300 mt-1 uppercase tracking-wider">
                  {done}/{total} complete · {pct}%
                </p>
              </div>
              <div className="shrink-0 w-24 h-1.5 bg-bone overflow-hidden">
                <div className="h-full bg-copper transition-all" style={{ width: `${pct}%` }} />
              </div>
            </button>

            {isOpen && (
              <>
                <ul>
                  {phase.tasks.map((task) => (
                    <TaskRowItem
                      key={task.id}
                      task={task}
                      projectId={projectId}
                      phaseOptions={phaseOptions}
                    />
                  ))}
                  {!phase.tasks.length && (
                    <li className="p-6 text-sm text-ink/50 italic border-t border-ink/10">
                      No tasks yet — add site-specific items below.
                    </li>
                  )}
                </ul>
                {allowAdd && (
                  <AddTaskForm
                    projectId={projectId}
                    phaseKey={phase.phaseKey}
                    milestoneId={phase.milestoneId}
                  />
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
