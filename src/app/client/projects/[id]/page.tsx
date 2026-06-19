import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProgressRing } from "@/components/hub/HubUI";

export const dynamic = "force-dynamic";

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: "border-stone-300 text-stone-300",
  in_progress: "border-copper/50 text-copper bg-copper/5",
  completed: "border-emerald-500/50 text-emerald-600 bg-emerald-50",
  blocked: "border-amber-500/50 text-amber-600",
};

export default async function ClientProjectDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, location, start_date, target_completion_date, square_footage")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: milestones },
    { data: updates },
    { data: documents },
    { data: selections },
    { data: invoices },
    { data: pendingPlanSets },
  ] = await Promise.all([
      supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("display_order", { ascending: true }),
      supabase
        .from("project_updates")
        .select("id, title, body, created_at, project_update_images(id, public_url, caption)")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("project_documents")
        .select("id, title, category")
        .eq("project_id", project.id)
        .eq("visibility", "client")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("project_selections")
        .select("id, status, due_date")
        .eq("project_id", project.id)
        .eq("client_visible", true),
      supabase
        .from("invoices")
        .select("id, status")
        .eq("project_id", project.id)
        .neq("status", "paid"),
      supabase
        .from("project_plan_sets")
        .select("id, title, version")
        .eq("project_id", project.id)
        .eq("status", "pending_client"),
    ]);

  const completed = (milestones ?? []).filter((m) => m.status === "completed").length;
  const progress = milestones?.length ? Math.round((completed / milestones.length) * 100) : 0;
  const selectionsDue = (selections ?? []).filter(
    (s) => s.status === "client_review" || (s.due_date && s.due_date <= today && s.status !== "approved")
  ).length;
  const invoicesDue = (invoices ?? []).length;
  const plansAwaitingSignOff = (pendingPlanSets ?? []).length;

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 md:py-14">
      {(selectionsDue > 0 || invoicesDue > 0 || plansAwaitingSignOff > 0) && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {selectionsDue > 0 && (
            <Link
              href={`/client/projects/${project.id}/selections`}
              className="hub-panel p-5 flex items-center justify-between hover:border-copper/40 transition-colors"
            >
              <span className="text-sm text-ink">
                {selectionsDue} selection{selectionsDue > 1 ? "s" : ""} need your attention
              </span>
              <span className="text-copper font-mono text-xs">Review →</span>
            </Link>
          )}
          {invoicesDue > 0 && (
            <Link
              href={`/client/projects/${project.id}/billing`}
              className="hub-panel p-5 flex items-center justify-between hover:border-copper/40 transition-colors"
            >
              <span className="text-sm text-ink">
                {invoicesDue} invoice{invoicesDue > 1 ? "s" : ""} ready
              </span>
              <span className="text-copper font-mono text-xs">Pay →</span>
            </Link>
          )}
          {plansAwaitingSignOff > 0 && (
            <Link
              href={`/client/projects/${project.id}/plans`}
              className="hub-panel p-5 flex items-center justify-between hover:border-emerald-400/50 transition-colors border-emerald-200/60"
            >
              <span className="text-sm text-ink">
                Plans ready for your sign-off
                {plansAwaitingSignOff > 1 ? ` (${plansAwaitingSignOff})` : ""}
              </span>
              <span className="text-emerald-700 font-mono text-xs">Review →</span>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-10 mb-12 items-start">
        <ProgressRing pct={progress} label="Timeline" />
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Phases", value: `${completed}/${milestones?.length ?? 0}` },
            { label: "Updates", value: updates?.length ?? 0 },
            { label: "Documents", value: documents?.length ?? 0 },
          ].map((s) => (
            <div key={s.label} className="hub-metric">
              <div className="eyebrow">{s.label}</div>
              <div className="font-display text-2xl mt-2">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="hub-panel p-8">
            <div className="flex justify-between items-baseline mb-6">
              <h2 className="font-display text-xl text-ink">Timeline</h2>
              <Link
                href={`/client/projects/${project.id}/schedule`}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-copper hover:underline"
              >
                Full schedule →
              </Link>
            </div>
            {milestones && milestones.length > 0 ? (
              <ol className="space-y-4">
                {milestones.map((m, i) => (
                  <li key={m.id}>
                    <Link
                      href={`/client/projects/${project.id}/schedule`}
                      className="flex gap-4 group"
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${
                          m.status === "completed"
                            ? "bg-emerald-500"
                            : m.status === "in_progress"
                              ? "bg-copper"
                              : "bg-stone-300"
                        }`}
                      />
                      <div className={i < milestones.length - 1 ? "pb-4 border-b border-ink/5 flex-1" : "flex-1"}>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-ink group-hover:text-copper transition-colors">
                            {m.title}
                          </h3>
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border ${MILESTONE_STATUS_COLORS[m.status]}`}
                          >
                            {m.status.replace("_", " ")}
                          </span>
                        </div>
                        {m.target_date && (
                          <div className="text-xs text-stone-300 font-mono mt-1">
                            Target {new Date(m.target_date + "T12:00:00").toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ink/50 italic text-sm">Your timeline will appear here as phases are published.</p>
            )}
          </section>

          <section className="hub-panel p-8">
            <div className="flex justify-between items-baseline mb-6">
              <h2 className="font-display text-xl text-ink">Recent updates</h2>
              <Link
                href={`/client/projects/${project.id}/updates`}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-copper hover:underline"
              >
                View all →
              </Link>
            </div>
            {updates && updates.length > 0 ? (
              <div className="space-y-8">
                {updates.map((u) => (
                  <Link
                    key={u.id}
                    href={`/client/projects/${project.id}/updates`}
                    className="block border-b border-ink/8 last:border-0 pb-8 last:pb-0 group"
                  >
                    <div className="text-xs text-stone-300 font-mono mb-2">
                      {new Date(u.created_at).toLocaleDateString()}
                    </div>
                    <h3 className="font-display text-lg text-ink mb-2 group-hover:text-copper transition-colors">
                      {u.title}
                    </h3>
                    {u.body && (
                      <p className="text-sm text-ink/75 leading-relaxed whitespace-pre-wrap line-clamp-4">{u.body}</p>
                    )}
                    {u.project_update_images && u.project_update_images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {u.project_update_images.map((img) => (
                          <div key={img.id} className="aspect-square relative bg-bone overflow-hidden">
                            <Image src={img.public_url} alt={img.caption || u.title} fill className="object-cover" sizes="160px" />
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-ink/50 italic text-sm">Progress photos and notes from the field will show here.</p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className="hub-panel p-6">
            <h2 className="eyebrow mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-mono uppercase text-stone-300">Location</dt>
                <dd className="text-ink mt-1">{project.location || "—"}</dd>
              </div>
              {project.target_completion_date && (
                <div>
                  <dt className="text-[10px] font-mono uppercase text-stone-300">Target completion</dt>
                  <dd className="text-ink mt-1">
                    {new Date(project.target_completion_date + "T12:00:00").toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="hub-panel p-6">
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="eyebrow">Documents</h2>
              <Link
                href={`/client/projects/${project.id}/documents`}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-copper hover:underline"
              >
                View all →
              </Link>
            </div>
            {documents && documents.length > 0 ? (
              <ul className="space-y-3 text-sm">
                {documents.map((d) => (
                  <li key={d.id}>
                    <div className="font-medium text-ink">{d.title}</div>
                    <a href={`/api/documents/${d.id}/download`} className="text-[10px] font-mono uppercase text-copper mt-1 inline-block hover:underline">
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink/50 italic text-xs">Shared files will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
