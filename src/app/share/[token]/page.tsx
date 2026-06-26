import Image from "next/image";
import { notFound } from "next/navigation";
import { ProjectGantt } from "@/components/schedule/ProjectGantt";
import { SharePasswordGate } from "@/components/schedule/SharePasswordGate";
import {
  loadShareMilestones,
  loadShareUpdates,
  resolveShareAccess,
} from "@/lib/share/access";
import { BRAND } from "@/lib/brand/assets";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build Progress — 8th Street Construction",
  robots: { index: false, follow: false },
};

export default async function SharePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const access = await resolveShareAccess(token);

  if (access.state === "not_found") notFound();
  if (access.state === "locked") {
    return <SharePasswordGate token={token} projectTitle={access.project.title} />;
  }

  const project = access.project;
  const [milestones, updates] = await Promise.all([
    loadShareMilestones(project.id),
    loadShareUpdates(project.id),
  ]);

  return (
    <div className="min-h-screen bg-bone">
      <header className="bg-navy">
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <Image
            src="/img/logo-horizontal-navy.svg"
            alt={BRAND.name}
            width={220}
            height={52}
            className="h-10 w-auto"
            priority
          />
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-parchment/50">
              {BRAND.tagline}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 md:px-8 py-10 md:py-14">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
            Build progress
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl text-ink tracking-tight">
            {project.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/55">
            {project.location && <span>{project.location}</span>}
            {project.target_completion_date && (
              <span>
                Target completion ·{" "}
                {new Date(`${project.target_completion_date}T12:00:00`).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        <ProjectGantt
          milestones={milestones}
          projectStart={project.start_date}
          projectEnd={project.target_completion_date}
          dateMode="client"
          title="Project schedule"
          subtitle="Target dates for each phase of your build."
        />

        {updates.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl md:text-2xl text-ink mb-6">Recent updates</h2>
            <div className="space-y-8">
              {updates.map((u) => (
                <article key={u.id} className="hub-panel p-6 md:p-7">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-stone-400 mb-2">
                    {new Date(u.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <h3 className="font-display text-lg text-ink mb-2">{u.title}</h3>
                  {u.body && (
                    <p className="text-sm text-ink/75 leading-relaxed whitespace-pre-wrap">
                      {u.body}
                    </p>
                  )}
                  {u.project_update_images && u.project_update_images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                      {u.project_update_images.map((img) => (
                        <div key={img.id} className="aspect-square relative bg-bone overflow-hidden">
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
          </section>
        )}

        <footer className="mt-16 pt-8 border-t border-ink/10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400">
            {BRAND.name} · {BRAND.parent}
          </p>
        </footer>
      </main>
    </div>
  );
}
