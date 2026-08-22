import { requireClientProjectFeature } from "@/lib/portal/access";
import Link from "next/link";
import Image from "next/image";
import { CloudSun, HardHat } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDailyLogsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectFeature(id, "daily_logs");

  const { data: logs } = await supabase
    .from("project_daily_logs")
    .select(
      "id, log_date, weather, crew_count, summary, project_daily_log_images(id, storage_path, caption, display_order)"
    )
    .eq("project_id", id)
    .order("log_date", { ascending: false })
    .limit(60);

  return (
    <div className="max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-medium app-muted transition-colors hover:text-copper"
      >
        ← Overview
      </Link>
      <h2 className="mt-4 app-h1 !text-[24px]">Site diary</h2>
      <p className="mt-2 text-sm app-muted">
        Day-by-day notes from the field on {project.title}.
      </p>

      <ol className="mt-10 space-y-4">
        {(logs ?? []).map((log) => (
          <li key={log.id} className="app-card overflow-hidden p-5 md:p-6">
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
