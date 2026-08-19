import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createMeeting } from "@/lib/actions/meetings";
import { listActionItems, listMeetings, getMeetingSeries } from "@/lib/meetings/queries";
import { formatMeetingDate } from "@/lib/meetings/minutes-format";
import { MEETING_STATUS_LABELS, OPEN_ACTION_STATUSES } from "@/lib/meetings/types";
import { appStatusBadge } from "@/lib/project/status-badges";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const supabase = await createClient();

  const [meetings, series, openItems] = await Promise.all([
    listMeetings(supabase, { limit: 40 }),
    getMeetingSeries(supabase),
    listActionItems(supabase, { status: [...OPEN_ACTION_STATUSES] }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = openItems.filter((a) => a.due_date && a.due_date < today).length;
  const awaitingConfirmation = meetings.filter((m) => m.status === "draft_minutes").length;

  const stats = [
    { label: "Open action items", value: openItems.length },
    { label: "Overdue", value: overdue, alert: overdue > 0 },
    { label: "Minutes awaiting confirmation", value: awaitingConfirmation },
    { label: "Meetings on file", value: meetings.length },
  ];

  return (
    <div className="max-w-4xl space-y-8 p-4 md:p-8 lg:p-10">
      <div>
        <p className="app-label">Company</p>
        <h2 className="mt-2 app-h1">Meetings &amp; Minutes</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed app-muted">
          Every meeting, what was decided, and who owes what by when. Minutes are filed as a draft,
          confirmed at the following meeting, then locked. Action items are chased automatically and
          can be pushed onto a job&apos;s build board.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="app-card p-4">
            <div
              className={`text-2xl font-semibold tabular-nums ${
                s.alert ? "text-red-700" : "text-navy"
              }`}
            >
              {s.value}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide app-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/meetings/action-items" className="app-btn app-btn-primary">
          Action items
        </Link>
        <Link href="/admin/assistant" className="app-btn app-btn-secondary">
          File minutes with the Assistant
        </Link>
      </div>

      <div className="app-card divide-y divide-navy/[0.06]">
        {meetings.length === 0 && (
          <p className="p-8 text-sm italic app-muted">
            No meetings yet — start one below, or paste a set of notes into the Assistant.
          </p>
        )}
        {meetings.map((m) => (
          <Link
            key={m.id}
            href={`/admin/meetings/${m.id}`}
            className="flex items-center gap-4 p-5 transition-colors hover:bg-navy/[0.02]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-navy">{m.title}</span>
              <span className="block truncate text-[12.5px] app-muted">
                {formatMeetingDate(m.meeting_date)}
                {m.series ? ` · ${m.series.name}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-right">
              {m.open_action_count > 0 && (
                <span
                  className={`block text-[12.5px] ${
                    m.overdue_action_count > 0 ? "text-red-700" : "app-muted"
                  }`}
                >
                  {m.open_action_count} open
                  {m.overdue_action_count > 0 ? ` · ${m.overdue_action_count} overdue` : ""}
                </span>
              )}
            </span>
            <span className={`${appStatusBadge("meeting", m.status)} shrink-0`}>
              {MEETING_STATUS_LABELS[m.status]}
            </span>
          </Link>
        ))}
      </div>

      <div className="app-card p-6 md:p-8">
        <h3 className="app-h2 !text-[16px] mb-2">Start a meeting</h3>
        <p className="mb-5 text-sm leading-relaxed app-muted">
          Pick a standing meeting and the agenda builds itself: the usual running order, anything
          left hanging last time, every open action item, and a progress line per live job.
        </p>
        <form
          action={async (fd: FormData) => {
            "use server";
            const { id } = await createMeeting(fd);
            redirect(`/admin/meetings/${id}`);
          }}
          className="grid gap-4 md:grid-cols-3"
        >
          <div>
            <label className="app-label" htmlFor="series_id">
              Meeting
            </label>
            <select id="series_id" name="series_id" className="mt-1 w-full">
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="">One-off meeting</option>
            </select>
          </div>
          <div>
            <label className="app-label" htmlFor="meeting_date">
              Date
            </label>
            <input
              id="meeting_date"
              type="date"
              name="meeting_date"
              required
              defaultValue={today}
              className="mt-1 w-full"
            />
          </div>
          <div className="flex items-end">
            <SubmitButton className="app-btn app-btn-accent w-full">
              Build the agenda
            </SubmitButton>
          </div>
          <div className="md:col-span-3">
            <label className="app-label" htmlFor="title">
              Title (optional — defaults to the meeting name)
            </label>
            <input id="title" name="title" className="mt-1 w-full" />
          </div>
        </form>
      </div>
    </div>
  );
}
