import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/HubUI";
import {
  deleteScopeTemplate,
  recordScopeVarianceNote,
  saveScopeTemplate,
} from "@/lib/actions/scope-templates";
import { scopeVariances } from "@/lib/procurement/scope-variance";
import { formatMoney } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

type ScopeRow = {
  id: string;
  trade: string;
  title: string;
  body_md: string;
  last_variance_note: string | null;
  last_variance_at: string | null;
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
  const [{ data }, { data: awarded }] = await Promise.all([
    supabase
      .from("scope_templates")
      .select("id, trade, title, body_md, last_variance_note, last_variance_at")
      .order("trade")
      .order("title"),
    supabase
      .from("bids")
      .select(
        "amount, bid_request:bid_requests!inner(scope_template_id, title, estimate_line:project_estimate_lines(estimated_amount, awarded_amount, trade_label))"
      )
      .eq("status", "awarded")
      .not("bid_requests.scope_template_id", "is", null),
  ]);
  const scopes = (data ?? []) as ScopeRow[];
  const varianceInputs = (awarded ?? []).flatMap((bid) => {
    const request = Array.isArray(bid.bid_request) ? bid.bid_request[0] : bid.bid_request;
    if (!request?.scope_template_id) return [];
    const line = Array.isArray(request.estimate_line)
      ? request.estimate_line[0]
      : request.estimate_line;
    const template = scopes.find((s) => s.id === request.scope_template_id);
    if (!template) return [];
    return [
      {
        templateId: template.id,
        trade: template.trade,
        title: template.title,
        budget: line?.estimated_amount == null ? null : Number(line.estimated_amount),
        awarded: Number(bid.amount),
      },
    ];
  });
  const variances = scopeVariances(varianceInputs);

  return (
    <div className="max-w-3xl">
      <HubPageHeader
        title="Scope library"
        description="How we build, written down per trade. New bid requests can start from one of these, so the standard is what subs actually price — not a hope."
      />

      {variances.length > 0 && (
        <section className="app-card mb-8 p-6">
          <h3 className="app-h2 !text-[16px]">Awarded prices off the library</h3>
          <p className="mt-1 text-xs app-muted">
            Jobs where the awarded bid missed the estimate by 10% or more. Write what should
            change in the standard before the next takeoff.
          </p>
          <ul className="mt-4 space-y-3">
            {variances.map((row) => (
              <li key={`${row.templateId}-${row.awarded}`} className="border-t border-ink/8 pt-3">
                <p className="text-sm text-navy">
                  {row.trade} — {row.title}
                </p>
                <p className="text-xs app-muted">
                  Estimate {formatMoney(row.budget)} · awarded {formatMoney(row.awarded)} ·{" "}
                  <span className="app-num">
                    {row.variancePct > 0 ? "+" : ""}
                    {row.variancePct}%
                  </span>
                </p>
                <form action={recordScopeVarianceNote} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={row.templateId} />
                  <input
                    name="last_variance_note"
                    required
                    placeholder="What the next estimate should assume…"
                    className="field-input !h-8 min-w-[240px] flex-1 !text-xs"
                    defaultValue={
                      scopes.find((s) => s.id === row.templateId)?.last_variance_note ?? ""
                    }
                  />
                  <button type="submit" className="app-btn app-btn-secondary !h-8 !text-xs">
                    Save to library
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                {s.last_variance_note && (
                  <span className="text-xs app-muted">Last job note: {s.last_variance_note}</span>
                )}
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
