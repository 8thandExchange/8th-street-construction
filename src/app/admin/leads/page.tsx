import { createClient } from "@/lib/supabase/server";
import { deleteLead } from "@/lib/actions/leads";
import { DeleteLeadButton } from "@/components/admin/DeleteLeadButton";
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
    <div className="p-4 md:p-8 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="eyebrow">— Inbox</span>
          <h1 className="mt-2 app-h1">Leads</h1>
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
              ? "app-btn app-btn-primary !h-8 !px-3.5 !text-[12.5px]"
              : "app-btn app-btn-secondary !h-8 !px-3.5 !text-[12.5px]"
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
                ? "app-btn app-btn-primary !h-8 !px-3.5 !text-[12.5px]"
                : "app-btn app-btn-secondary !h-8 !px-3.5 !text-[12.5px]"
            }`}
          >
            {LEAD_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {leads && leads.length > 0 ? (
        <div className="app-card overflow-hidden overflow-x-auto">
          <table className="app-table">
            <thead>
              <tr>
                <th className="">Name</th>
                <th className="hidden md:table-cell">Email</th>
                <th className="hidden lg:table-cell">Project</th>
                <th className="">Status</th>
                <th className="!text-right">Received</th>
                <th className="!text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="cursor-pointer">
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-sm text-ink/70 hidden md:table-cell">
                    <a href={`mailto:${lead.email}`} className="hover:text-copper">
                      {lead.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink/60 hidden lg:table-cell">
                    {lead.project_type ? PROJECT_CATEGORY_LABELS[lead.project_type] : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block app-badge border !text-[11px] ${
                        LEAD_STATUS_COLORS[lead.status]
                      }`}
                    >
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-stone-300 font-mono">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteLead} className="inline-block">
                      <input type="hidden" name="id" value={lead.id} />
                      <DeleteLeadButton
                        leadName={`${lead.first_name} ${lead.last_name}`}
                      />
                    </form>
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
