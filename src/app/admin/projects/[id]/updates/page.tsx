import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { NewUpdateForm } from "@/components/project-hub/NewUpdateForm";
import { deleteProjectUpdate } from "@/lib/actions/updates";

export const dynamic = "force-dynamic";

export default async function ProjectUpdatesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: updates } = await supabase
    .from("project_updates")
    .select(
      "id, title, body, created_at, project_update_images(id, public_url, caption)"
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h2 className="font-display text-2xl text-ink">Progress Updates</h2>
          <p className="text-sm text-ink/60 mt-2">
            Share field photos and notes — clients see these in their portal.
          </p>
        </div>
        <NewUpdateForm projectId={id} />
      </div>

      <div className="space-y-8">
        {(updates ?? []).map((u: {
          id: string;
          title: string;
          body: string | null;
          created_at: string;
          project_update_images: { id: string; public_url: string; caption: string | null }[];
        }) => (
          <article key={u.id} className="bg-paper border border-ink/15 p-8">
            <div className="flex justify-between items-start gap-4">
              <div>
                <time className="text-xs font-mono text-stone-300 uppercase tracking-wider">
                  {new Date(u.created_at).toLocaleDateString()}
                </time>
                <h3 className="font-display text-xl text-ink mt-2">{u.title}</h3>
              </div>
              <form
                action={async (fd) => {
                  await deleteProjectUpdate(fd);
                }}
              >
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="project_id" value={id} />
                <button
                  type="submit"
                  className="text-[10px] font-mono uppercase text-stone-300 hover:text-red-600"
                >
                  Delete
                </button>
              </form>
            </div>
            {u.body && (
              <p className="mt-4 text-ink/80 whitespace-pre-wrap leading-relaxed">{u.body}</p>
            )}
            {u.project_update_images?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                {u.project_update_images.map((img) => (
                  <div key={img.id} className="aspect-square relative bg-bone overflow-hidden">
                    <Image
                      src={img.public_url}
                      alt={img.caption || u.title}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
        {!updates?.length && (
          <p className="text-ink/50 italic py-12 text-center border border-dashed border-ink/20">
            No updates yet — post your first progress report.
          </p>
        )}
      </div>
    </div>
  );
}
