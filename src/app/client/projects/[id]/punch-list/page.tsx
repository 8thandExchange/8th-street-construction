import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientPunchListPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const { data: items } = await supabase
    .from("punch_list_items")
    .select("title, location, status, description, completed_at")
    .eq("project_id", id)
    .order("status")
    .order("created_at", { ascending: false });

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <h2 className="font-display text-xl text-ink mb-2">Punch List</h2>
      <p className="mt-2 text-sm text-ink/60">Closeout items we are tracking for your walkthrough.</p>

      <ul className="mt-10 space-y-3">
        {(items ?? []).map((item, i) => (
          <li key={i} className="p-5 border border-ink/15 bg-paper">
            <div className="flex items-center gap-2">
              <span
                className={`w-4 h-4 border flex items-center justify-center text-[10px] ${
                  item.status === "complete" ? "bg-copper border-copper text-bone" : "border-ink/30"
                }`}
              >
                {item.status === "complete" ? "✓" : ""}
              </span>
              <span className={item.status === "complete" ? "text-stone-300 line-through" : "text-ink"}>
                {item.title}
              </span>
              {item.location && (
                <span className="text-xs font-mono text-stone-300">{item.location}</span>
              )}
            </div>
            {item.description && <p className="mt-2 text-sm text-ink/60 ml-6">{item.description}</p>}
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
