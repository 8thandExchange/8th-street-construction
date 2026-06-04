import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
    .select("*")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const [{ data: milestones }, { data: updates }, { data: documents }] = await Promise.all([
    supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", project.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("project_updates")
      .select(
        "id, title, body, created_at, project_update_images(id, public_url, caption)"
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("project_documents")
      .select("id, title, description, category, file_size_bytes, created_at")
      .eq("project_id", project.id)
      .eq("visibility", "client")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-7xl">
      <div className="mb-6">
        <Link
          href="/client"
          className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
        >
          ← My Projects
        </Link>
      </div>

      <div className="mb-8">
        <span className="eyebrow">— Project</span>
        <h1 className="mt-2 font-display text-display-md text-ink leading-tight">
          {project.title}
        </h1>
        {project.subtitle && (
          <p className="mt-3 text-lg text-ink/65">{project.subtitle}</p>
        )}
      </div>

      <nav className="flex gap-2 overflow-x-auto mb-10 pb-1">
        {[
          { href: `/client/projects/${project.id}`, label: "Overview", active: true },
          { href: `/client/projects/${project.id}/messages`, label: "Messages" },
          { href: `/client/projects/${project.id}/change-orders`, label: "Change Orders" },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 px-4 py-2 font-mono text-[10px] tracking-[0.18em] uppercase border ${
              tab.active
                ? "bg-ink text-bone border-ink"
                : "border-ink/15 text-ink/70 hover:border-ink/40"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: timeline + updates */}
        <div className="lg:col-span-2 space-y-10">
          {/* Milestones */}
          <section className="bg-paper border border-ink/15 p-8">
            <h2 className="font-display text-2xl text-ink mb-6">Timeline</h2>
            {milestones && milestones.length > 0 ? (
              <ol className="space-y-5">
                {milestones.map((m, i) => (
                  <li key={m.id} className="flex gap-5">
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          m.status === "completed"
                            ? "bg-emerald-500"
                            : m.status === "in_progress"
                            ? "bg-copper"
                            : "bg-stone-300"
                        }`}
                      />
                      {i < milestones.length - 1 && (
                        <div className="flex-1 w-px bg-ink/15 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-ink">{m.title}</h3>
                        <span
                          className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${MILESTONE_STATUS_COLORS[m.status]}`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                      </div>
                      {m.description && (
                        <p className="text-sm text-ink/65 mt-1">{m.description}</p>
                      )}
                      {m.target_date && (
                        <div className="text-xs text-stone-300 font-mono mt-2">
                          Target: {new Date(m.target_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ink/50 italic text-sm">
                Your project manager hasn't published milestones yet. They'll appear here as the project is broken down into phases.
              </p>
            )}
          </section>

          {/* Updates */}
          <section className="bg-paper border border-ink/15 p-8">
            <h2 className="font-display text-2xl text-ink mb-6">Progress Updates</h2>
            {updates && updates.length > 0 ? (
              <div className="space-y-8">
                {updates.map((u: any) => (
                  <article key={u.id} className="border-b border-ink/10 last:border-b-0 pb-8 last:pb-0">
                    <div className="text-xs text-stone-300 font-mono tracking-wider uppercase mb-2">
                      {new Date(u.created_at).toLocaleDateString()}
                    </div>
                    <h3 className="font-display text-xl text-ink mb-3">{u.title}</h3>
                    {u.body && (
                      <p className="text-base text-ink/80 leading-relaxed whitespace-pre-wrap mb-4">
                        {u.body}
                      </p>
                    )}
                    {u.project_update_images && u.project_update_images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        {u.project_update_images.map((img: any) => (
                          <div key={img.id} className="aspect-square bg-bone relative overflow-hidden">
                            <Image
                              src={img.public_url}
                              alt={img.caption || u.title}
                              fill
                              className="object-cover"
                              sizes="200px"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-ink/50 italic text-sm">
                No updates posted yet. Once construction begins, you'll see regular progress posts here with photos and notes from the field.
              </p>
            )}
          </section>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">
          {/* Project info */}
          <div className="bg-paper border border-ink/15 p-6">
            <h2 className="eyebrow mb-4">Project Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-stone-300 font-mono uppercase tracking-wider">Location</dt>
                <dd className="text-ink mt-1">{project.location || "—"}</dd>
              </div>
              {project.start_date && (
                <div>
                  <dt className="text-xs text-stone-300 font-mono uppercase tracking-wider">Started</dt>
                  <dd className="text-ink mt-1">{new Date(project.start_date).toLocaleDateString()}</dd>
                </div>
              )}
              {project.target_completion_date && (
                <div>
                  <dt className="text-xs text-stone-300 font-mono uppercase tracking-wider">Target Completion</dt>
                  <dd className="text-ink mt-1">
                    {new Date(project.target_completion_date).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {project.square_footage && (
                <div>
                  <dt className="text-xs text-stone-300 font-mono uppercase tracking-wider">Square Footage</dt>
                  <dd className="text-ink mt-1">{project.square_footage.toLocaleString()} sq ft</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Documents */}
          <div className="bg-paper border border-ink/15 p-6">
            <h2 className="eyebrow mb-4">Documents</h2>
            {documents && documents.length > 0 ? (
              <ul className="space-y-3">
                {documents.map((d) => (
                  <li key={d.id} className="text-sm">
                    <div className="font-medium text-ink">{d.title}</div>
                    {d.category && (
                      <div className="text-xs text-stone-300 font-mono mt-0.5 capitalize">
                        {d.category}
                      </div>
                    )}
                    <a
                      href={`/api/documents/${d.id}/download`}
                      className="inline-block mt-2 text-[10px] font-mono uppercase tracking-wider text-copper hover:underline"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink/50 italic text-xs">
                Contracts, plans, and permits will appear here as they're shared.
              </p>
            )}
          </div>

          <div className="bg-navy text-bone p-6">
            <h2 className="eyebrow-copper mb-3">— Portal</h2>
            <p className="text-sm text-bone/75 mb-4">
              Message your team or review change orders.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/client/projects/${project.id}/messages`}
                className="block w-full text-center h-11 leading-[44px] bg-copper text-bone hover:bg-copper-400 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
              >
                Messages
              </Link>
              <Link
                href={`/client/projects/${project.id}/change-orders`}
                className="block w-full text-center h-11 leading-[44px] border border-bone/30 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-copper transition-colors"
              >
                Change Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
