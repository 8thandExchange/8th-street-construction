"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  reorderMilestones,
  setMilestoneStatus,
} from "@/lib/actions/milestones";
import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLES,
} from "@/lib/project/labels";

export type MilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  completed_at: string | null;
  display_order: number;
};

function SortableRow({
  m,
  projectId,
  onEdit,
}: {
  m: MilestoneRow;
  projectId: string;
  onEdit: (m: MilestoneRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: m.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex gap-4 p-5 bg-paper border border-ink/15 group"
    >
      <button
        type="button"
        className="mt-1 cursor-grab text-stone-300 hover:text-ink touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="font-medium text-ink">{m.title}</h3>
          <span
            className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${MILESTONE_STATUS_STYLES[m.status]}`}
          >
            {MILESTONE_STATUS_LABELS[m.status]}
          </span>
        </div>
        {m.description && (
          <p className="text-sm text-ink/65 line-clamp-2">{m.description}</p>
        )}
        {m.target_date && (
          <p className="text-xs font-mono text-stone-300 mt-2">
            Target {new Date(m.target_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <select
          value={m.status}
          className="field-input text-xs py-1.5 min-w-[120px]"
          onChange={async (e) => {
            await setMilestoneStatus(projectId, m.id, e.target.value);
          }}
        >
          {Object.entries(MILESTONE_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onEdit(m)}
          className="text-[10px] font-mono uppercase tracking-wider text-stone-300 hover:text-ink"
        >
          Edit
        </button>
        <form
          action={async (fd) => {
            await deleteMilestone(fd);
          }}
        >
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="project_id" value={projectId} />
          <button
            type="submit"
            className="text-[10px] font-mono uppercase tracking-wider text-stone-300 hover:text-red-600"
          >
            Delete
          </button>
        </form>
      </div>
    </li>
  );
}

export function MilestoneBoard({
  projectId,
  initial,
}: {
  projectId: string;
  initial: MilestoneRow[];
}) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<MilestoneRow | null>(null);
  const [showNew, setShowNew] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await reorderMilestones(
      projectId,
      next.map((i) => i.id)
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink/60">
          Drag to reorder. Clients see this timeline in their portal.
        </p>
        <button
          type="button"
          onClick={() => {
            setShowNew(true);
            setEditing(null);
          }}
          className="app-btn app-btn-primary"
        >
          + Milestone
        </button>
      </div>

      {(showNew || editing) && (
        <form
          action={async (fd) => {
            const res = editing
              ? await updateMilestone(fd)
              : await createMilestone(fd);
            if (!res?.error) {
              setShowNew(false);
              setEditing(null);
              window.location.reload();
            }
          }}
          className="mb-8 p-6 border border-copper/30 bg-copper/5 space-y-4"
        >
          <input type="hidden" name="project_id" value={projectId} />
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <h3 className="eyebrow">{editing ? "Edit Milestone" : "New Milestone"}</h3>
          <div>
            <label className="field-label">Title *</label>
            <input
              name="title"
              required
              defaultValue={editing?.title}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={editing?.description ?? ""}
              className="field-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Target date</label>
              <input
                type="date"
                name="target_date"
                defaultValue={editing?.target_date?.slice(0, 10) ?? ""}
                className="field-input"
              />
            </div>
            {editing && (
              <div>
                <label className="field-label">Status</label>
                <select
                  name="status"
                  defaultValue={editing.status}
                  className="field-input"
                >
                  {Object.entries(MILESTONE_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="h-10 px-5 app-btn app-btn-primary"
            >
              {editing ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNew(false);
                setEditing(null);
              }}
              className="h-10 px-5 app-btn app-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {items.map((m) => (
              <SortableRow key={m.id} m={m} projectId={projectId} onEdit={setEditing} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {items.length === 0 && !showNew && (
        <div className="py-16 text-center border border-dashed border-ink/20">
          <p className="text-ink/50 italic">No milestones yet — add your first phase.</p>
        </div>
      )}
    </div>
  );
}
