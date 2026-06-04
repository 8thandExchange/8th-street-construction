import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  createPunchItem,
  togglePunchComplete,
  deletePunchItem,
} from "@/lib/actions/punch-list";

export const dynamic = "force-dynamic";

export default async function ProjectPunchListPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: items } = await supabase
    .from("punch_list_items")
    .select("*")
    .eq("project_id", id)
    .order("status")
    .order("due_date", { ascending: true, nullsFirst: false });

  const open = (items ?? []).filter((i) => i.status !== "complete").length;
  const done = (items ?? []).filter((i) => i.status === "complete").length;

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl text-ink mb-2">Punch List</h2>
      <p className="text-sm text-ink/60 mb-4">
        Closeout deficiencies — {open} open, {done} complete. Client can view items in their portal.
      </p>

      <form
        action={async (fd) => {
          "use server";
          await createPunchItem(fd);
        }}
        className="p-6 border border-ink/15 bg-paper space-y-4 mb-10"
      >
        <input type="hidden" name="project_id" value={id} />
        <h3 className="eyebrow">Add punch item</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="field-label">Issue *</label>
            <input name="title" required className="field-input" />
          </div>
          <div>
            <label className="field-label">Location</label>
            <input name="location" className="field-input" placeholder="Master bath" />
          </div>
          <div>
            <label className="field-label">Trade</label>
            <input name="assigned_trade" className="field-input" placeholder="Plumbing" />
          </div>
          <div>
            <label className="field-label">Priority</label>
            <select name="priority" className="field-input">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="field-label">Due</label>
            <input type="date" name="due_date" className="field-input" />
          </div>
          <div className="md:col-span-2">
            <textarea name="description" rows={2} className="field-input" placeholder="Notes" />
          </div>
        </div>
        <button type="submit" className="h-10 px-5 bg-ink text-bone font-mono text-[10px] uppercase">
          Add Item
        </button>
      </form>

      <ul className="space-y-3">
        {(items ?? []).map((item) => (
          <li key={item.id} className="p-5 border border-ink/15 bg-paper flex gap-4">
            <form action={togglePunchComplete}>
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="current_status" value={item.status} />
              <button
                type="submit"
                className={`w-5 h-5 border flex items-center justify-center ${
                  item.status === "complete"
                    ? "bg-copper border-copper text-bone"
                    : "border-ink/30"
                }`}
              >
                {item.status === "complete" ? "✓" : ""}
              </button>
            </form>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 items-center">
                <span
                  className={`text-sm ${item.status === "complete" ? "line-through text-stone-300" : "text-ink"}`}
                >
                  {item.title}
                </span>
                {item.location && (
                  <span className="text-[10px] font-mono text-stone-300">{item.location}</span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-ink/55 mt-1">{item.description}</p>
              )}
              <div className="text-[10px] font-mono text-stone-300 mt-2 uppercase">
                {item.assigned_trade && `${item.assigned_trade} · `}
                {item.status.replace("_", " ")}
              </div>
            </div>
            <form action={deletePunchItem}>
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="text-stone-300 hover:text-red-600 text-xs">
                ×
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
