import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function updateLead(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const prevStatus = String(formData.get("prev_status") || "");
  const notes = String(formData.get("notes") || "");

  const update: Record<string, unknown> = { status, notes };

  // Set status-driven timestamps only when the status is actually changing
  const changed = status !== prevStatus;
  if (changed && status === "contacted") update.contacted_at = new Date().toISOString();
  if (changed && status === "qualified") update.qualified_at = new Date().toISOString();
  if (changed && ["won", "lost", "archived"].includes(status))
    update.closed_at = new Date().toISOString();

  const { error } = await supabase.from("leads").update(update).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export default async function AdminLeadDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!lead) notFound();

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/leads"
          className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
        >
          ← All Leads
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <span className="eyebrow">— Lead</span>
          <h1 className="mt-2 font-display text-display-md text-ink">
            {lead.first_name} {lead.last_name}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border ${
                LEAD_STATUS_COLORS[lead.status]
              }`}
            >
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
            <span className="text-xs text-stone-300 font-mono">
              Received {new Date(lead.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <a
            href={`mailto:${lead.email}`}
            className="text-copper hover:text-copper-400 editorial-link"
          >
            {lead.email}
          </a>
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="text-copper hover:text-copper-400 editorial-link"
            >
              {lead.phone}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-paper border border-ink/15 p-8">
            <h2 className="eyebrow mb-4">Message</h2>
            <p className="text-base text-ink/85 leading-relaxed whitespace-pre-wrap">
              {lead.message}
            </p>
          </div>

          <div className="bg-paper border border-ink/15 p-8">
            <h2 className="eyebrow mb-4">Details</h2>
            <dl className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <dt className="text-stone-300 font-mono tracking-wider text-xs">Project Type</dt>
              <dd className="text-ink">
                {lead.project_type ? PROJECT_CATEGORY_LABELS[lead.project_type] : "—"}
              </dd>
              <dt className="text-stone-300 font-mono tracking-wider text-xs">Source</dt>
              <dd className="text-ink">{lead.source || "website"}</dd>
              {lead.utm_source && (
                <>
                  <dt className="text-stone-300 font-mono tracking-wider text-xs">UTM Source</dt>
                  <dd className="text-ink">{lead.utm_source}</dd>
                </>
              )}
              {lead.utm_campaign && (
                <>
                  <dt className="text-stone-300 font-mono tracking-wider text-xs">UTM Campaign</dt>
                  <dd className="text-ink">{lead.utm_campaign}</dd>
                </>
              )}
              {lead.contacted_at && (
                <>
                  <dt className="text-stone-300 font-mono tracking-wider text-xs">Contacted At</dt>
                  <dd className="text-ink">{new Date(lead.contacted_at).toLocaleString()}</dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Right: actions */}
        <div className="space-y-8">
          <form action={updateLead} className="bg-paper border border-ink/15 p-6">
            <input type="hidden" name="id" value={lead.id} />
            <input type="hidden" name="prev_status" value={lead.status} />
            <h2 className="eyebrow mb-4">Update</h2>
            <div className="flex flex-col gap-5">
              <div>
                <label className="field-label">Status</label>
                <select
                  name="status"
                  defaultValue={lead.status}
                  className="field-input"
                >
                  {Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Internal Notes</label>
                <textarea
                  name="notes"
                  defaultValue={lead.notes ?? ""}
                  rows={6}
                  className="field-input py-3 resize-none"
                  placeholder="Visible only to admin"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
              >
                Save Changes
              </button>
            </div>
          </form>

          <div className="bg-paper border border-ink/15 p-6">
            <h2 className="eyebrow mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href={`mailto:${lead.email}`}
                className="editorial-link text-copper hover:text-copper-400"
              >
                ✉ Reply by email
              </a>
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="editorial-link text-copper hover:text-copper-400"
                >
                  ☎ Call {lead.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
