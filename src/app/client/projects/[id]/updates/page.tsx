import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GalleryGrid } from "@/components/photos/GalleryGrid";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function ClientUpdatesPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await props.params;
  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: updates, count } = await supabase
    .from("project_updates")
    .select(
      "id, title, body, created_at, project_update_images(id, public_url, caption)",
      { count: "exact" }
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const total = count ?? 0;
  const hasPrev = page > 1;
  const hasNext = to + 1 < total;

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <h2 className="mt-4 font-display text-xl text-ink mb-2">Project Updates</h2>
      <p className="mt-2 text-sm text-ink/60">
        Progress photos and notes from the field
        {total > 0 ? ` · ${total} total` : ""}.
      </p>

      <div className="mt-10 space-y-8">
        {(updates ?? []).map((u) => (
          <article key={u.id} className="hub-panel p-6 md:p-8">
            <div className="text-xs text-stone-300 font-mono mb-2">
              {new Date(u.created_at).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <h3 className="font-display text-lg text-ink mb-2">{u.title}</h3>
            {u.body && (
              <p className="text-sm text-ink/75 leading-relaxed whitespace-pre-wrap">{u.body}</p>
            )}
            {u.project_update_images && u.project_update_images.length > 0 && (
              <div className="mt-4">
                <GalleryGrid
                  images={u.project_update_images.map((img) => ({
                    id: img.id,
                    url: img.public_url,
                    caption: img.caption || u.title,
                  }))}
                  columns={3}
                />
              </div>
            )}
          </article>
        ))}
        {!updates?.length && (
          <p className="text-ink/50 italic py-12 text-center border border-dashed border-ink/20">
            No updates have been posted yet.
          </p>
        )}
      </div>

      {(hasPrev || hasNext) && (
        <div className="mt-10 flex items-center justify-between">
          {hasPrev ? (
            <Link
              href={`/client/projects/${id}/updates?page=${page - 1}`}
              className="h-10 px-4 inline-flex items-center border border-ink/20 font-mono text-[10px] tracking-[0.15em] uppercase hover:bg-ink hover:text-bone transition-colors"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs font-mono text-stone-300">Page {page}</span>
          {hasNext ? (
            <Link
              href={`/client/projects/${id}/updates?page=${page + 1}`}
              className="h-10 px-4 inline-flex items-center border border-ink/20 font-mono text-[10px] tracking-[0.15em] uppercase hover:bg-ink hover:text-bone transition-colors"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
