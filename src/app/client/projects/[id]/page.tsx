import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GanttChart } from "@/components/portal/GanttChart";

export const dynamic = "force-dynamic";

function fmtBytes(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ClientProjectDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS also enforces this, but belt-and-suspenders: only the assigned
  // client (or an admin) may load this page.
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (project.client_id !== user.id && profile?.role !== "admin") notFound();

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
      .select("id, title, description, storage_path, category, file_size_bytes, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  // The project-documents bucket is private — mint short-lived signed URLs.
  const signedDocs = await Promise.all(
    (documents ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage
        .from("project-documents")
        .createSignedUrl(d.storage_path, 60 * 60);
      return { ...d, url: signed?.signedUrl ?? null };
    })
  );

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

      <div className="mb-12">
        <span className="eyebrow">— Project</span>
        <h1 className="mt-2 font-display text-display-md text-ink leading-tight">
          {project.title}
        </h1>
        {project.subtitle && (
          <p className="mt-3 text-lg text-ink/65">{project.subtitle}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: timeline + updates */}
        <div className="lg:col-span-2 space-y-10">
          {/* Schedule */}
          <section className="bg-paper border border-ink/15 p-8">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-display text-2xl text-ink">Schedule</h2>
              <span className="eyebrow">— Build Timeline</span>
            </div>
            {milestones && milestones.length > 0 ? (
              <GanttChart
                milestones={milestones}
                projectStart={project.start_date}
                projectTarget={project.target_completion_date}
              />
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
            {signedDocs.length > 0 ? (
              <ul className="space-y-3">
                {signedDocs.map((d) => (
                  <li key={d.id} className="text-sm">
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline justify-between gap-3"
                      >
                        <span className="font-medium text-ink group-hover:text-copper transition-colors">
                          {d.title}
                          <span className="ml-1.5 text-copper opacity-0 group-hover:opacity-100 transition-opacity">↓</span>
                        </span>
                        {fmtBytes(d.file_size_bytes) && (
                          <span className="text-[10px] font-mono text-stone-300 shrink-0">
                            {fmtBytes(d.file_size_bytes)}
                          </span>
                        )}
                      </a>
                    ) : (
                      <div className="font-medium text-ink/50">{d.title}</div>
                    )}
                    {d.category && (
                      <div className="text-xs text-stone-300 font-mono mt-0.5 capitalize">
                        {d.category}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink/50 italic text-xs">
                Contracts, plans, and permits will appear here as they're shared.
              </p>
            )}
          </div>

          {/* Messages CTA */}
          <div className="bg-navy text-bone p-6">
            <h2 className="eyebrow-copper mb-3">— Questions?</h2>
            <p className="text-sm text-bone/75 mb-4">
              Reach your project manager directly.
            </p>
            <a
              href="mailto:hello@8thstreetconstruction.com"
              className="block w-full text-center h-11 leading-[44px] bg-copper text-bone hover:bg-copper-400 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
            >
              Email Project Manager
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
