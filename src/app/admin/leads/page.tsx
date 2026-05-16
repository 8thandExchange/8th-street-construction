import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "proposal_sent", "won", "lost", "archived"] as const;

export default async function AdminLeads(
  props: {
    searchParams?: Promise<{ status?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const status = searchParams?.status;

  let query = supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, status, project_type, message, created_at")
    .order("created_at", { ascending: false });

  if (status && (STATUS_OPTIONS as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }

  const { data: leads } = await query;

  return (
    <div className="p-8 md:p-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="eyebrow">— Inbox</span>
          <h1 className="mt-2 font-display text-display-md text-ink">Leads</h1>
        </div>
        <div className="text-sm text-stone-300 font-mono tracking-wider">
          {leads?.length ?? 0} {status ? `${LEAD_STATUS_LABELS[status]}` : "total"}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/admin/leads"
          className={`inline-flex items-center px-3 h-8 font-mono text-[11px] tracking-[0.18em] uppercase border transition-colors ${
            !status
              ? "bg-ink text-bone border-ink"
              : "border-ink/20 text-ink/70 hover:border-ink"
          }`}
        >
          All
        </Link>
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={`/admin/leads?status=${s}`}
            className={`inline-flex items-center px-3 h-8 font-mono text-[11px] tracking-[0.18em] uppercase border transition-colors ${
              status === s
                ? "bg-ink text-bone border-ink"
                : "border-ink/20 text-ink/70 hover:border-ink"
            }`}
          >
            {LEAD_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {leads && leads.length > 0 ? (
        <div className="bg-paper border border-ink/15">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <th className="px-6 py-4 eyebrow">Name</th>
                <th className="px-6 py-4 eyebrow hidden md:table-cell">Email</th>
                <th className="px-6 py-4 eyebrow hidden lg:table-cell">Project</th>
                <th className="px-6 py-4 eyebrow">Status</th>
                <th className="px-6 py-4 eyebrow text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-bone/50 cursor-pointer">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="block font-medium text-ink hover:text-copper"
                    >
                      {lead.first_name} {lead.last_name}
                    </Link>
                    {lead.phone && (
                      <div className="text-xs text-stone-300 font-mono mt-1">{lead.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink/70 hidden md:table-cell">
                    <a href={`mailto:${lead.email}`} className="hover:text-copper">
                      {lead.email}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink/60 hidden lg:table-cell">
                    {lead.project_type ? PROJECT_CATEGORY_LABELS[lead.project_type] : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border ${
                        LEAD_STATUS_COLORS[lead.status]
                      }`}
                    >
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-stone-300 font-mono">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-ink/15 p-16 text-center bg-paper">
          <p className="text-ink/50 italic">
            {status
              ? `No leads with status "${LEAD_STATUS_LABELS[status]}".`
              : "No leads yet."}
          </p>
        </div>
      )}
    </div>
  );
}
