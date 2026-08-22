import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
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
    .select(
      "id, log_date, weather, crew_count, summary, issues, created_at, project_daily_log_images(id, storage_path, caption, display_order)"
    )
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
              {log.project_daily_log_images?.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[...log.project_daily_log_images]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((image) => {
                      const { data } = supabase.storage
                        .from("project-updates")
                        .getPublicUrl(image.storage_path);
                      return (
                        <figure key={image.id} className="overflow-hidden rounded-lg border border-navy/10">
                          <div className="relative aspect-[4/3] bg-navy/[0.04]">
                            <Image
                              src={data.publicUrl}
                              alt={image.caption || "Jobsite progress"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, 360px"
                            />
                          </div>
                          {image.caption && (
                            <figcaption className="px-3 py-2 text-xs app-muted">
                              {image.caption}
                            </figcaption>
                          )}
                        </figure>
                      );
                    })}
                </div>
              )}
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
