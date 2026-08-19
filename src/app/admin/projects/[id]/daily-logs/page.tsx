import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { deleteDailyLog } from "@/lib/actions/daily-logs";
import { DailyLogForm } from "@/components/project-hub/DailyLogForm";

export const dynamic = "force-dynamic";

export default async function ProjectDailyLogsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const { data: logs } = await supabase
    .from("project_daily_logs")
    .select("id, log_date, weather, crew_count, summary, issues, created_at")
    .eq("project_id", id)
    .order("log_date", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl">
      <h2 className="app-h1 !text-[18px]">Daily Logs</h2>
      <p className="mt-2 text-sm app-muted max-w-xl">
        Field notes for {project.title} — weather, crew, work completed, and issues. One entry per
        calendar day.
      </p>

      <DailyLogForm projectId={id} today={today} />

      <div className="mt-10 space-y-4">
        {(logs ?? []).length === 0 ? (
          <p className="app-card p-10 text-center text-sm italic app-muted">No daily logs yet.</p>
        ) : (
          logs!.map((log) => (
            <article key={log.id} className="app-card p-6">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div className="text-xs app-muted">
                  {log.log_date}
                  {log.weather && ` · ${log.weather}`}
                  {log.crew_count != null && ` · ${log.crew_count} on site`}
                </div>
                <form
                  action={async (fd) => {
                    "use server";
                    await deleteDailyLog(fd);
                  }}
                >
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="id" value={log.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </div>
              <p className="text-ink whitespace-pre-wrap">{log.summary}</p>
              {log.issues && (
                <p className="mt-3 text-sm app-muted border-t border-ink/10 pt-3">
                  <span className="font-medium text-ink">Issues — </span>
                  {log.issues}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
