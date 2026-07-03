import { createClient } from "@/lib/supabase/server";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  PROJECT_CATEGORY_LABELS,
} from "@/lib/utils";
import {
  convertLeadToProject,
  deleteLead,
  updateLead,
  updateLeadPipeline,
} from "@/lib/actions/leads";
import { DeleteLeadButton } from "@/components/admin/DeleteLeadButton";
import { ConvertToProjectButton } from "@/components/admin/ConvertToProjectButton";
import { PROJECT_CATEGORIES } from "@/lib/validations";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLeadDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!lead) notFound();

  const leadName = `${lead.first_name} ${lead.last_name}`;

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl">
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
          <h1 className="mt-2 app-h1">{leadName}</h1>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`app-badge border !text-[11px] ${
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
        <div className="lg:col-span-2 space-y-8">
          <form action={updateLead} className="bg-paper border border-ink/15 p-8 space-y-6">
            <input type="hidden" name="id" value={lead.id} />
            <input type="hidden" name="status" value={lead.status} />
            <input type="hidden" name="notes" value={lead.notes ?? ""} />
            <h2 className="eyebrow">Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="field-label">First Name</label>
                <input
                  name="first_name"
                  defaultValue={lead.first_name}
                  required
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Last Name</label>
                <input
                  name="last_name"
                  defaultValue={lead.last_name}
                  required
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={lead.email}
                  required
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input name="phone" defaultValue={lead.phone ?? ""} className="field-input" />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Project Type</label>
                <select
                  name="project_type"
                  defaultValue={lead.project_type ?? ""}
                  className="field-input"
                >
                  <option value="">— Not specified —</option>
                  {PROJECT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {PROJECT_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">Message</label>
              <textarea
                name="message"
                defaultValue={lead.message}
                required
                rows={8}
                className="field-input py-3 resize-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center px-6 app-btn app-btn-primary"
            >
              Save Changes
            </button>
          </form>

          <div className="bg-paper border border-ink/15 p-8">
            <h2 className="eyebrow mb-4">Submission Details</h2>
            <dl className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
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

        <div className="space-y-8">
          <form action={updateLeadPipeline} className="bg-paper border border-ink/15 p-6">
            <input type="hidden" name="id" value={lead.id} />
            <h2 className="eyebrow mb-4">Pipeline</h2>
            <div className="flex flex-col gap-5">
              <div>
                <label className="field-label">Status</label>
                <select name="status" defaultValue={lead.status} className="field-input">
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
                className="inline-flex h-12 items-center justify-center app-btn app-btn-primary"
              >
                Save Status
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

          <form action={convertLeadToProject} className="bg-paper border border-ink/15 p-6">
            <input type="hidden" name="id" value={lead.id} />
            <h2 className="eyebrow mb-2">Won this lead?</h2>
            <p className="text-sm text-ink/60 mb-4">
              Create a pre-construction project pre-filled from this lead and mark it won.
            </p>
            <ConvertToProjectButton
              confirmText={`Create a project from ${leadName} and mark this lead won?`}
            />
          </form>

          <form action={deleteLead} className="bg-paper border border-red-200/60 p-6">
            <input type="hidden" name="id" value={lead.id} />
            <h2 className="eyebrow mb-2 text-red-700/80">Danger Zone</h2>
            <p className="text-sm text-ink/60 mb-4">
              Permanently remove this lead. Use this to clean up test submissions.
            </p>
            <DeleteLeadButton leadName={leadName} />
          </form>
        </div>
      </div>
    </div>
  );
}
