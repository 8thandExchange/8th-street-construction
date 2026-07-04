import { requireClientProjectAccess } from "@/lib/portal/access";
import Link from "next/link";
import { GalleryGrid, type GalleryImage } from "@/components/photos/GalleryGrid";

export const dynamic = "force-dynamic";

type UpdateWithImages = {
  id: string;
  title: string;
  created_at: string;
  project_update_images: { id: string; public_url: string; caption: string | null }[];
};

export default async function ClientPhotosPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectAccess(id);

  const { data: updates } = await supabase
    .from("project_updates")
    .select("id, title, created_at, project_update_images(id, public_url, caption)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const albums = ((updates ?? []) as UpdateWithImages[])
    .filter((u) => u.project_update_images?.length)
    .map((u) => ({
      id: u.id,
      title: u.title,
      date: new Date(u.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      images: u.project_update_images.map(
        (img): GalleryImage => ({
          id: img.id,
          url: img.public_url,
          caption: img.caption || u.title,
          date: new Date(u.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        })
      ),
    }));

  const totalPhotos = albums.reduce((sum, a) => sum + a.images.length, 0);

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-4xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <h2 className="mt-4 font-display text-xl text-ink mb-2">Photos</h2>
      <p className="mt-2 text-sm text-ink/60">
        {totalPhotos > 0
          ? `${totalPhotos} photo${totalPhotos === 1 ? "" : "s"} from ${project.title}. Tap any photo to view fullscreen.`
          : "Photos from your build will appear here as progress updates are posted."}
      </p>

      <div className="mt-10 space-y-12">
        {albums.map((album) => (
          <section key={album.id}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h3 className="font-medium text-ink">{album.title}</h3>
              <span className="shrink-0 text-[11px] font-mono uppercase tracking-[0.12em] text-stone-300">
                {album.date}
              </span>
            </div>
            <GalleryGrid images={album.images} columns={3} />
          </section>
        ))}
        {!albums.length && (
          <p className="text-ink/50 italic text-sm py-12 text-center border border-dashed border-ink/15">
            No photos yet — check back after the next progress update.
          </p>
        )}
      </div>
    </div>
  );
}
