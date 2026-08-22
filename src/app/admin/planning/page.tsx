import Link from "next/link";
import { saveCrewWeek } from "@/lib/actions/crew-planning";
import { loadCrewBoard } from "@/lib/data/crew-planning";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  addDays,
  CREW_WEEK_STATUS_LABELS,
  formatWeekLabel,
  type CrewWeekStatus,
} from "@/lib/planning/crew-capacity";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";
import { appStatusBadge } from "@/lib/project/status-badges";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<CrewWeekStatus, string> = {
  unplanned: "app-badge app-badge-neutral",
  on_plan: "app-badge app-badge-green",
  over: "app-badge app-badge-red",
  under: "app-badge app-badge-amber",
  no_log: "app-badge app-badge-blue",
};

export default async function CrewPlanningPage(props: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await props.searchParams;
  const board = await loadCrewBoard(week);
  const prevWeek = addDays(board.weekStart, -7);
  const nextWeek = addDays(board.weekStart, 7);

  return (
    <div className="max-w-5xl p-4 md:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="app-label">Build</span>
          <h1 className="mt-2 app-h1 !text-[26px]">This week</h1>
          <p className="mt-2 max-w-2xl app-muted">
            How many people each job needs, next to how many showed up on the field notes.
            Saving a number also becomes that job&apos;s default for the following week.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Week">
          <Link href={`/admin/planning?week=${prevWeek}`} className="app-btn app-btn-ghost">
            Previous
          </Link>
          <span className="px-2 text-sm font-medium text-navy">{formatWeekLabel(board.weekStart)}</span>
          <Link href={`/admin/planning?week=${nextWeek}`} className="app-btn app-btn-ghost">
            Next
          </Link>
        </nav>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Active jobs" value={board.totals.jobs} />
        <SummaryCard
          label="Planned on jobs"
          value={board.totals.planned}
          hint={board.totals.unplanned ? `${board.totals.unplanned} still need a number` : "Every job has a plan"}
        />
        <SummaryCard
          label="Over plan"
          value={board.totals.over}
          hint="Logged crew larger than the plan"
          accent={board.totals.over > 0}
        />
        <SummaryCard
          label="No field log"
          value={board.totals.noLog}
          hint="A plan exists, but no crew count this week"
        />
      </div>

      {board.jobs.length === 0 ? (
        <p className="app-card p-6 text-sm italic app-muted">
          No pre-construction or in-progress jobs in your scope.
        </p>
      ) : (
        <ul className="space-y-4">
          {board.jobs.map((job) => (
            <li key={job.id} className="app-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/projects/${job.id}/daily-logs`}
                    className="text-[15px] font-medium text-navy hover:text-copper"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-1 text-sm app-muted">
                    {job.phase ?? "No current phase"}
                    {job.location ? ` · ${job.location}` : ""}
                  </p>
                  <p className="mt-1 text-xs app-muted">
                    PM {job.pmName ?? "—"} · Super {job.superName ?? "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={appStatusBadge("project", job.status)}>
                    {PROJECT_STATUS_LABELS[job.status] ?? job.status}
                  </span>
                  <span className={STATUS_BADGE[job.weekStatus]}>
                    {CREW_WEEK_STATUS_LABELS[job.weekStatus]}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm text-navy">
                {job.actualMax != null
                  ? `${job.actualMax} logged · ${job.daysLogged} day${job.daysLogged === 1 ? "" : "s"}`
                  : "No crew count on the field notes this week"}
              </p>

              <form action={saveCrewWeek} className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
                <input type="hidden" name="project_id" value={job.id} />
                <input type="hidden" name="week_start" value={board.weekStart} />
                <label className="block">
                  <span className="field-label">Planned</span>
                  <input
                    type="number"
                    name="planned_crew"
                    min={0}
                    required
                    defaultValue={job.planned ?? ""}
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Note</span>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={job.notes ?? ""}
                    placeholder="Framers + one laborer"
                    className="field-input"
                  />
                </label>
                <SubmitButton className="app-btn app-btn-secondary">Save</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`app-card p-4 ${accent ? "ring-1 ring-red-200" : ""}`}>
      <p className="app-label">{label}</p>
      <p className="mt-1 text-lg font-semibold text-navy app-num">{value}</p>
      {hint ? <p className="mt-1 text-xs app-muted">{hint}</p> : null}
    </div>
  );
}
