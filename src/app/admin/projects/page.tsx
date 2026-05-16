import { createClient } from "@/lib/supabase/server";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pre_construction: "Pre-Construction",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  archived: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "border-stone-300 text-stone-300",
  pre_construction: "border-blue-400/50 text-blue-500",
  in_progress: "border-copper/50 text-copper",
  completed: "border-emerald-500/50 text-emerald-600",
  on_hold: "border-amber-500/50 text-amber-600",
  archived: "border-stone-300 text-stone-300",
};

export default async function AdminProjects() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, slug, title, category, status, year_completed, featured, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="p-8 md:p-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="eyebrow">— Portfolio</span>
          <h1 className="mt-2 font-display text-display-md text-ink">Projects</h1>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
        >
          + New Project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="bg-paper border border-ink/15">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <th className="px-6 py-4 eyebrow">Title</th>
                <th className="px-6 py-4 eyebrow hidden md:table-cell">Category</th>
                <th className="px-6 py-4 eyebrow">Status</th>
                <th className="px-6 py-4 eyebrow hidden lg:table-cell">Year</th>
                <th className="px-6 py-4 eyebrow text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-bone/50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="block font-medium text-ink hover:text-copper"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-stone-300 font-mono mt-1">
                      /{p.slug} {p.featured && <span className="text-copper">· Featured</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink/70 hidden md:table-cell">
                    {PROJECT_CATEGORY_LABELS[p.category]}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border ${STATUS_COLORS[p.status]}`}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink/60 hidden lg:table-cell">
                    {p.year_completed ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-stone-300 font-mono">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-ink/15 p-16 text-center bg-paper">
          <p className="text-ink/50 italic mb-6">No projects yet.</p>
          <Link
            href="/admin/projects/new"
            className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
          >
            Create Your First Project
          </Link>
        </div>
      )}
    </div>
  );
}
