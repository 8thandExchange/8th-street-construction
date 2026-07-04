import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  createSelection,
  updateSelection,
  deleteSelection,
  addSelectionOption,
  deleteSelectionOption,
} from "@/lib/actions/selections";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "exterior",
  "flooring",
  "cabinets",
  "countertops",
  "tile",
  "plumbing_fixtures",
  "lighting",
  "appliances",
  "hardware",
  "paint",
  "other",
];

const STATUSES = ["pending", "client_review", "selected", "ordered", "installed", "approved"];

export default async function ProjectSelectionsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: items } = await supabase
    .from("project_selections")
    .select("*, selection_options(id, title, price, vendor, image_url, display_order)")
    .eq("project_id", id)
    .order("due_date", { ascending: true, nullsFirst: false });

  const allowanceTotal = (items ?? []).reduce((s, i) => s + Number(i.allowance_amount ?? 0), 0);
  const selectedTotal = (items ?? []).reduce((s, i) => s + Number(i.selected_amount ?? 0), 0);

  return (
    <div className="max-w-3xl">
      <h2 className="app-h1 !text-[18px] mb-2">Selections & Allowances</h2>
      <p className="text-sm text-ink/60 mb-6">
        Track finish selections, allowances, and deadlines. Client-visible items appear in their
        portal for approval.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 border border-ink/15 bg-paper">
          <div className="eyebrow">Allowances</div>
          <div className="app-h1 !text-[18px] mt-1">${allowanceTotal.toLocaleString()}</div>
        </div>
        <div className="p-5 border border-ink/15 bg-paper">
          <div className="eyebrow">Selected</div>
          <div className="app-h1 !text-[18px] mt-1">${selectedTotal.toLocaleString()}</div>
          {allowanceTotal > 0 && (
            <div className="text-xs font-mono text-stone-300 mt-1">
              {selectedTotal > allowanceTotal ? "Over allowance" : "Within budget"}
            </div>
          )}
        </div>
      </div>

      <form
        action={async (fd) => {
          "use server";
          await createSelection(fd);
        }}
        className="p-6 border border-ink/15 bg-paper space-y-4 mb-10"
      >
        <input type="hidden" name="project_id" value={id} />
        <h3 className="eyebrow">Add selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="field-label">Title *</label>
            <input name="title" required className="field-input" placeholder="Selection title" />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select name="category" className="field-input">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Due date</label>
            <input type="date" name="due_date" className="field-input" />
          </div>
          <div>
            <label className="field-label">Allowance ($)</label>
            <input type="number" step="0.01" name="allowance_amount" className="field-input" />
          </div>
          <div>
            <label className="field-label">Selected cost ($)</label>
            <input type="number" step="0.01" name="selected_amount" className="field-input" />
          </div>
          <div>
            <label className="field-label">Vendor</label>
            <input name="vendor" className="field-input" />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select name="status" className="field-input" defaultValue="pending">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Product / spec</label>
            <textarea name="product_spec" rows={2} className="field-input" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="client_visible" defaultChecked className="accent-copper" />
          Visible to client
        </label>
        <button type="submit" className="h-10 px-5 app-btn app-btn-primary">
          Add Selection
        </button>
      </form>

      <div className="space-y-4">
        {(items ?? []).map((item) => (
          <details key={item.id} className="border border-ink/15 bg-paper">
            <summary className="p-5 cursor-pointer flex justify-between gap-4 list-none">
              <div>
                <div className="font-medium text-ink">{item.title}</div>
                <div className="text-xs font-mono text-stone-300 mt-1">
                  {item.category.replace(/_/g, " ")} · {item.status.replace(/_/g, " ")}
                </div>
              </div>
              <div className="text-right text-sm font-mono">
                {item.allowance_amount != null && (
                  <div>${Number(item.allowance_amount).toLocaleString()} allowance</div>
                )}
              </div>
            </summary>
            <form
              action={async (fd) => {
                "use server";
                await updateSelection(fd);
              }}
              className="px-5 pb-5 border-t border-ink/10 pt-4 grid grid-cols-2 gap-3"
            >
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="id" value={item.id} />
              <div className="col-span-2">
                <input name="title" defaultValue={item.title} className="field-input" required />
              </div>
              <select name="category" defaultValue={item.category} className="field-input">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={item.status} className="field-input">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="allowance_amount"
                defaultValue={item.allowance_amount ?? ""}
                className="field-input"
                placeholder="Allowance"
              />
              <input
                type="number"
                name="selected_amount"
                defaultValue={item.selected_amount ?? ""}
                className="field-input"
                placeholder="Selected $"
              />
              <input name="vendor" defaultValue={item.vendor ?? ""} className="field-input" />
              <input
                type="date"
                name="due_date"
                defaultValue={item.due_date ?? ""}
                className="field-input"
              />
              <textarea
                name="product_spec"
                defaultValue={item.product_spec ?? ""}
                rows={2}
                className="field-input col-span-2"
              />
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="client_visible"
                  defaultChecked={item.client_visible}
                  className="accent-copper"
                />
                Client visible
              </label>
              <button type="submit" className="h-9 px-4 app-btn app-btn-primary">
                Save
              </button>
            </form>
            <div className="px-5 pb-2 border-t border-ink/10 pt-4">
              <div className="eyebrow mb-2">Options for the client to choose from</div>
              {((item.selection_options ?? []) as {
                id: string;
                title: string;
                price: number | null;
                vendor: string | null;
                image_url: string | null;
                display_order: number;
              }[])
                .sort((a, b) => a.display_order - b.display_order)
                .map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between gap-3 border border-ink/10 bg-bone px-3 py-2 mb-2"
                  >
                    <div className="min-w-0 text-sm text-ink">
                      <span className={item.selected_option_id === opt.id ? "font-semibold text-copper" : ""}>
                        {opt.title}
                        {item.selected_option_id === opt.id && " ✓ client's choice"}
                      </span>
                      <span className="ml-2 text-xs text-stone-300">
                        {opt.price != null && `$${Number(opt.price).toLocaleString()}`}
                        {opt.vendor && ` · ${opt.vendor}`}
                        {opt.image_url && " · photo"}
                      </span>
                    </div>
                    <form
                      action={async (fd) => {
                        "use server";
                        await deleteSelectionOption(fd);
                      }}
                    >
                      <input type="hidden" name="project_id" value={id} />
                      <input type="hidden" name="option_id" value={opt.id} />
                      <button type="submit" className="text-[10px] font-mono uppercase text-red-600/70">
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              <form
                action={async (fd) => {
                  "use server";
                  await addSelectionOption(fd);
                }}
                className="grid grid-cols-2 gap-2 mt-3"
              >
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="selection_id" value={item.id} />
                <input name="title" required className="field-input" placeholder="Option name *" />
                <input type="number" step="0.01" name="price" className="field-input" placeholder="Price ($)" />
                <input name="vendor" className="field-input" placeholder="Vendor" />
                <input name="image_url" className="field-input" placeholder="Photo URL (optional)" />
                <textarea
                  name="description"
                  rows={2}
                  className="field-input col-span-2"
                  placeholder="Short description the client sees"
                />
                <div className="col-span-2">
                  <button type="submit" className="h-9 px-4 app-btn app-btn-secondary">
                    Add Option
                  </button>
                  <span className="ml-3 text-xs text-ink/50">
                    Set status to “client review” so the client can choose.
                  </span>
                </div>
              </form>
            </div>
            <form
              action={async (fd) => {
                "use server";
                await deleteSelection(fd);
              }}
              className="px-5 pb-4 pt-2"
            >
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="text-[10px] font-mono uppercase text-red-600/70">
                Delete
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
