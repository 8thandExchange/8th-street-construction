import Link from "next/link";
import {
  postActionUpdateForm,
  pushActionItemToProjectForm,
} from "@/lib/actions/meetings";
import { appStatusBadge } from "@/lib/project/status-badges";
import { daysUntilDue, formatDueDate } from "@/lib/meetings/minutes-format";
import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  OPEN_ACTION_STATUSES,
  ownerLabel,
  type ActionItemStatus,
} from "@/lib/meetings/types";
import type { ActionItemWithContext } from "@/lib/meetings/queries";
import type { ActionUpdateRow } from "@/lib/meetings/types";
import { SubmitButton } from "@/components/admin/SubmitButton";

/**
 * One action item, with the update box attached. Status can't be changed
 * without saying something — the note is the whole point of the record, and
 * a bare status flip tells nobody anything six months from now.
 */
export function ActionItemCard({
  item,
  updates,
  projects,
  showMeeting = true,
}: {
  item: ActionItemWithContext;
  updates?: ActionUpdateRow[];
  projects: { id: string; title: string }[];
  showMeeting?: boolean;
}) {
  const days = daysUntilDue(item.due_date);
  const isOpen = OPEN_ACTION_STATUSES.includes(item.status);
  const overdue = isOpen && days !== null && days < 0;
  const history = updates ?? (item.latest_update ? [item.latest_update] : []);

  return (
    <div className="app-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] leading-snug text-navy">{item.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs app-muted">
            <span>{ownerLabel(item)}</span>
            {item.owner_org && <span>· {item.owner_org}</span>}
            {item.is_external && (
              <span className="app-badge app-badge-neutral">External</span>
            )}
            {showMeeting && item.meeting && (
              <Link
                href={`/admin/meetings/${item.meeting.id}`}
                className="underline underline-offset-2 hover:text-copper"
              >
                {item.meeting.title} · {item.meeting.meeting_date}
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.due_date && (
            <span
              className={`text-xs ${overdue ? "text-red-700" : "app-muted"}`}
              title={formatDueDate(item.due_date)}
            >
              {overdue
                ? `${Math.abs(days!)}d overdue`
                : days === 0
                  ? "Due today"
                  : isOpen
                    ? `Due in ${days}d`
                    : formatDueDate(item.due_date)}
            </span>
          )}
          <span className={appStatusBadge("action_item", item.status)}>
            {ACTION_ITEM_STATUS_LABELS[item.status]}
          </span>
        </div>
      </div>

      {item.detail && (
        <p className="mt-3 text-sm leading-relaxed app-muted">{item.detail}</p>
      )}

      {history.length > 0 && (
        <div className="mt-4 space-y-2 border-l-2 border-navy/10 pl-3">
          {history.slice(0, 4).map((u) => (
            <div key={u.id} className="text-sm">
              <span className="text-navy">{u.body}</span>
              <span className="ml-2 text-xs app-muted">
                {u.author_name ? `${u.author_name} · ` : ""}
                {new Date(u.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      <form
        action={async (fd: FormData) => {
          "use server";
          await postActionUpdateForm(fd);
        }}
        className="mt-4 flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="action_item_id" value={item.id} />
        <div className="min-w-[220px] flex-1">
          <label className="app-label" htmlFor={`update-${item.id}`}>
            Where does this stand?
          </label>
          <input
            id={`update-${item.id}`}
            name="body"
            required
            placeholder="e.g. Spoke to McKenzie — dates land Friday"
            className="mt-1 w-full"
          />
        </div>
        <div>
          <label className="app-label" htmlFor={`status-${item.id}`}>
            Status
          </label>
          <select
            id={`status-${item.id}`}
            name="status"
            defaultValue={item.status}
            className="mt-1"
          >
            {ACTION_ITEM_STATUSES.map((s: ActionItemStatus) => (
              <option key={s} value={s}>
                {ACTION_ITEM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="app-label" htmlFor={`due-${item.id}`}>
            Due
          </label>
          <input
            id={`due-${item.id}`}
            type="date"
            name="due_date"
            defaultValue={item.due_date ?? ""}
            className="mt-1"
          />
        </div>
        <SubmitButton>Save update</SubmitButton>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs app-muted">
        {item.project_task_id ? (
          <span>
            On the board for{" "}
            {item.project ? (
              <Link
                href={`/admin/projects/${item.project.id}`}
                className="underline underline-offset-2 hover:text-copper"
              >
                {item.project.title}
              </Link>
            ) : (
              "a job"
            )}
          </span>
        ) : (
          <form
            action={async (fd: FormData) => {
              "use server";
              await pushActionItemToProjectForm(fd);
            }}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="action_item_id" value={item.id} />
            <select name="project_id" defaultValue={item.project_id ?? ""} required>
              <option value="">Add to a job&apos;s board…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <SubmitButton className="app-btn app-btn-ghost">Add</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
