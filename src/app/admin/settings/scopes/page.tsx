import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/HubUI";
import { deleteScopeTemplate, saveScopeTemplate } from "@/lib/actions/scope-templates";

export const dynamic = "force-dynamic";

type ScopeRow = {
  id: string;
  trade: string;
  title: string;
  body_md: string;
};

async function saveAction(formData: FormData) {
  "use server";
  await saveScopeTemplate(formData);
}

async function deleteAction(formData: FormData) {
  "use server";
  await deleteScopeTemplate(formData);
}

/**
 * The standards library: how 8th Street builds, written down per trade.
 * Everything here prefills bid requests, so a standard is what subs
 * actually price — advanced framing, air sealing, heat pumps and all.
 */
export default async function ScopeTemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scope_templates")
    .select("id, trade, title, body_md")
    .order("trade")
    .order("title");
  const scopes = (data ?? []) as ScopeRow[];

  return (
    <div className="max-w-3xl">
      <HubPageHeader
        title="Scope library"
        description="How we build, written down per trade. New bid requests can start from one of these, so the standard is what subs actually price — not a hope."
      />

      <form action={saveAction} className="app-card grid gap-4 p-6 mb-10">
        <h3 className="app-h2 !text-[16px]">Add a standard scope</h3>
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <div>
            <label className="field-label">Trade *</label>
            <input name="trade" required placeholder="Framing" className="field-input" />
          </div>
          <div>
            <label className="field-label">Title *</label>
            <input
              name="title"
              required
              placeholder="Advanced framing (OVE) — standard package"
              className="field-input"
            />
          </div>
        </div>
        <div>
          <label className="field-label">The scope, in full *</label>
          <textarea
            name="body_md"
            required
            rows={8}
            placeholder={"Studs 24\" o.c. aligned to trusses. Insulated three-stud corners. Single top plate with connectors. Right-sized headers, insulated where structural depth allows…"}
            className="field-input"
          />
        </div>
        <div>
          <button type="submit" className="app-btn app-btn-primary">
            Save to library
          </button>
        </div>
      </form>

      {scopes.length === 0 && (
        <div className="app-card p-10 text-center text-sm italic app-muted">
          Nothing in the library yet. Start with the trades where the technique matters most —
          framing, air sealing, HVAC.
        </div>
      )}

      <ul className="space-y-4">
        {scopes.map((s) => (
          <li key={s.id} className="app-card p-6">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span className="app-badge app-badge-neutral">{s.trade}</span>
                <span className="text-[15px] text-navy">{s.title}</span>
              </summary>
              <form action={saveAction} className="mt-4 grid gap-4">
                <input type="hidden" name="id" value={s.id} />
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div>
                    <label className="field-label">Trade</label>
                    <input name="trade" defaultValue={s.trade} required className="field-input" />
                  </div>
                  <div>
                    <label className="field-label">Title</label>
                    <input name="title" defaultValue={s.title} required className="field-input" />
                  </div>
                </div>
                <div>
                  <label className="field-label">Scope</label>
                  <textarea
                    name="body_md"
                    defaultValue={s.body_md}
                    required
                    rows={8}
                    className="field-input"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button type="submit" className="app-btn app-btn-primary">
                    Save changes
                  </button>
                </div>
              </form>
              <form action={deleteAction} className="mt-2">
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" className="text-xs text-red-700 hover:underline">
                  Remove from library
                </button>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
