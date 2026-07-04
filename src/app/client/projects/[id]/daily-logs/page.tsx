import { requireClientProjectAccess } from "@/lib/portal/access";
import Link from "next/link";
import { CloudSun, HardHat } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDailyLogsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectAccess(id);

  const { data: logs } = await supabase
    .from("project_daily_logs")
    .select("id, log_date, weather, crew_count, summary")
    .eq("project_id", id)
    .order("log_date", { ascending: false })
    .limit(60);

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-2xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <h2 className="mt-4 font-display text-xl text-ink mb-2">Site Diary</h2>
      <p className="mt-2 text-sm text-ink/60">
        Day-by-day notes from the field on {project.title}.
      </p>

      <ol className="mt-10 space-y-4">
        {(logs ?? []).map((log) => (
          <li key={log.id} className="border border-ink/15 bg-paper p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-medium text-ink">
                {new Date(`${log.log_date}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {log.weather && (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink/60">
                  <CloudSun size={13} className="text-copper" />
                  {log.weather}
                </span>
              )}
              {log.crew_count != null && log.crew_count > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink/60">
                  <HardHat size={13} className="text-copper" />
                  {log.crew_count} on site
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/80 whitespace-pre-wrap">
              {log.summary}
            </p>
          </li>
        ))}
        {!logs?.length && (
          <p className="text-ink/50 italic text-sm py-12 text-center border border-dashed border-ink/15">
            Daily field notes will appear here once work is underway.
          </p>
        )}
      </ol>
    </div>
  );
}
