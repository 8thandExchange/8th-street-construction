import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function createTestimonial(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("testimonials").insert({
    client_name: String(formData.get("client_name")).trim(),
    client_title: String(formData.get("client_title") || "").trim() || null,
    quote: String(formData.get("quote")).trim(),
    rating: formData.get("rating") ? Number(formData.get("rating")) : null,
    published: formData.get("published") === "on",
    featured: formData.get("featured") === "on",
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

async function togglePublished(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const published = formData.get("published") === "true";
  await supabase.from("testimonials").update({ published: !published }).eq("id", id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

async function deleteTestimonial(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export default async function AdminTestimonials() {
  const supabase = await createClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl">
      <div className="mb-10">
        <span className="eyebrow">— Social proof</span>
        <h1 className="mt-2 app-h1">Testimonials</h1>
      </div>

      {/* Add new */}
      <form
        action={createTestimonial}
        className="bg-paper border border-ink/15 p-8 mb-10 flex flex-col gap-5"
      >
        <h2 className="eyebrow">Add Testimonial</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="field-label">Client Name *</label>
            <input name="client_name" required className="field-input" />
          </div>
          <div>
            <label className="field-label">Title / Location</label>
            <input name="client_title" className="field-input" placeholder="Homeowner, Augusta GA" />
          </div>
        </div>
        <div>
          <label className="field-label">Quote *</label>
          <textarea name="quote" required rows={4} className="field-input py-3 resize-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="field-label">Rating (1-5)</label>
            <input type="number" name="rating" min="1" max="5" className="field-input" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="published" defaultChecked className="w-5 h-5 accent-copper" />
            <span className="text-sm text-ink">Publish immediately</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="featured" className="w-5 h-5 accent-copper" />
            <span className="text-sm text-ink">Feature on homepage</span>
          </label>
        </div>
        <button
          type="submit"
          className="self-start inline-flex h-11 items-center px-5 app-btn app-btn-primary"
        >
          + Add Testimonial
        </button>
      </form>

      {testimonials && testimonials.length > 0 ? (
        <div className="space-y-4">
          {testimonials.map((t) => (
            <div key={t.id} className="bg-paper border border-ink/15 p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="app-h2 leading-snug mb-3">
                    "{t.quote}"
                  </p>
                  <div className="text-sm text-ink">
                    <strong>{t.client_name}</strong>
                    {t.client_title && <span className="text-stone-300"> · {t.client_title}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block app-badge border !text-[11px] ${
                      t.published
                        ? "border-emerald-500/50 text-emerald-600"
                        : "border-stone-300 text-stone-300"
                    }`}
                  >
                    {t.published ? "Published" : "Draft"}
                  </span>
                  {t.featured && (
                    <span className="inline-block text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border border-copper/50 text-copper">
                      Featured
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-ink/10 flex gap-3">
                <form action={togglePublished}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="published" value={String(t.published)} />
                  <button
                    type="submit"
                    className="text-xs font-mono tracking-[0.18em] uppercase text-copper hover:text-copper-400"
                  >
                    {t.published ? "Unpublish" : "Publish"}
                  </button>
                </form>
                <form action={deleteTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-copper"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-ink/15 p-12 text-center bg-paper">
          <p className="text-ink/50 italic">No testimonials yet.</p>
        </div>
      )}
    </div>
  );
}
