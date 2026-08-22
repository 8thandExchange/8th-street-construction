import Link from "next/link";
import Image from "next/image";
import { requireClientProjectFeature } from "@/lib/portal/access";
import { ClientPunchItemForm } from "@/components/punch/ClientPunchItemForm";
import { PunchCommentForm } from "@/components/punch/PunchCommentForm";

export const dynamic = "force-dynamic";

export default async function ClientPunchListPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectFeature(id, "punch_list");
  const { data: items } = await supabase
    .from("punch_list_items")
    .select(
      "id, title, location, status, description, completed_at, punch_list_images(id, caption, created_at), punch_list_comments(id, body, created_at, author:profiles(first_name, last_name, role))"
    )
    .eq("project_id", id)
    .order("status")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-medium app-muted transition-colors hover:text-copper"
      >
        ← Overview
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="app-label">Closeout</span>
          <h2 className="mt-1 app-h1 !text-[24px]">Punch list</h2>
          <p className="mt-2 text-sm app-muted">
            Track walkthrough items with the team, including questions and photos.
          </p>
        </div>
        <ClientPunchItemForm projectId={id} />
      </div>

      <ul className="mt-8 space-y-4">
        {(items ?? []).map((item) => (
          <li key={item.id} className="app-card p-5 md:p-6">
            <div className="flex items-center gap-2">
              <span
                className={`w-4 h-4 border flex items-center justify-center text-[10px] ${
                  item.status === "complete" ? "bg-copper border-copper text-bone" : "border-ink/30"
                }`}
              >
                {item.status === "complete" ? "✓" : ""}
              </span>
              <span className={item.status === "complete" ? "app-muted line-through" : "text-ink"}>
                {item.title}
              </span>
              {item.location && (
                <span className="text-xs app-muted">{item.location}</span>
              )}
            </div>
            {item.description && <p className="mt-2 text-sm text-ink/60 ml-6">{item.description}</p>}
            {item.punch_list_images?.length > 0 && (
              <div className="ml-6 mt-4 grid gap-3 sm:grid-cols-2">
                {item.punch_list_images.map((image) => (
                  <figure key={image.id} className="overflow-hidden rounded-lg border border-navy/10">
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={`/api/punch-images/${image.id}`}
                        alt={image.caption || item.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 340px"
                      />
                    </div>
                    {image.caption && (
                      <figcaption className="px-3 py-2 text-xs app-muted">{image.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
            {item.punch_list_comments?.length > 0 && (
              <div className="ml-6 mt-4 space-y-2 border-l-2 border-navy/[0.08] pl-3">
                {item.punch_list_comments.map((comment) => {
                  const rawAuthor = comment.author;
                  const author = Array.isArray(rawAuthor) ? rawAuthor[0] : rawAuthor;
                  const name =
                    [author?.first_name, author?.last_name].filter(Boolean).join(" ") ||
                    (author?.role === "admin" ? "Project team" : "Client");
                  return (
                    <div key={comment.id} className="text-sm text-navy/75">
                      <p>{comment.body}</p>
                      <p className="mt-1 text-[11px] app-muted">
                        {name} · {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            {item.status !== "complete" && (
              <div className="ml-6">
                <PunchCommentForm projectId={id} itemId={item.id} />
              </div>
            )}
          </li>
        ))}
        {!items?.length && (
          <p className="text-ink/50 italic py-8 text-center border border-dashed border-ink/20">
            No punch list items yet.
          </p>
        )}
      </ul>
    </div>
  );
}
