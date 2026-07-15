import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import { convertConsultationToProject } from "@/lib/actions/consultations";
import { ConvertToProjectButton } from "@/components/admin/ConvertToProjectButton";
import { appStatusBadge } from "@/lib/project/status-badges";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

async function updateConsultationStatus(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const update: Record<string, unknown> = { status };
  if (status === "confirmed") update.confirmed_at = new Date().toISOString();

  await supabase.from("consultations").update(update).eq("id", id);
  revalidatePath("/admin/consultations");
  revalidatePath("/admin");
}

export default async function AdminConsultations() {
  const supabase = await createClient();
  const { data: consultations } = await supabase
    .from("consultations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <div className="mb-10">
        <span className="eyebrow">— Bookings</span>
        <h1 className="mt-2 app-h1">Consultations</h1>
      </div>

      {consultations && consultations.length > 0 ? (
        <div className="space-y-4">
          {consultations.map((c) => (
            <div key={c.id} className="bg-paper border border-ink/15 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="app-h1 !text-[18px]">
                      {c.first_name} {c.last_name}
                    </h3>
                    <span className={appStatusBadge("consultation", c.status)}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="eyebrow text-stone-300 mr-2">Email</span>
                      <a href={`mailto:${c.email}`} className="text-copper editorial-link">
                        {c.email}
                      </a>
                    </div>
                    <div>
                      <span className="eyebrow text-stone-300 mr-2">Phone</span>
                      <a href={`tel:${c.phone}`} className="text-copper editorial-link">
                        {c.phone}
                      </a>
                    </div>
                    <div>
                      <span className="eyebrow text-stone-300 mr-2">Preferred</span>
                      <span className="text-ink">
                        {c.preferred_date} · {c.preferred_time_window}
                      </span>
                    </div>
                    <div>
                      <span className="eyebrow text-stone-300 mr-2">Meeting</span>
                      <span className="text-ink capitalize">
                        {c.meeting_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {c.project_type && (
                      <div>
                        <span className="eyebrow text-stone-300 mr-2">Project</span>
                        <span className="text-ink">
                          {PROJECT_CATEGORY_LABELS[c.project_type]}
                        </span>
                      </div>
                    )}
                    {c.project_location && (
                      <div>
                        <span className="eyebrow text-stone-300 mr-2">Location</span>
                        <span className="text-ink">{c.project_location}</span>
                      </div>
                    )}
                  </div>
                  {c.notes && (
                    <div className="mt-4 pt-4 border-t border-ink/10">
                      <div className="eyebrow mb-2">Notes</div>
                      <p className="text-sm text-ink/80 whitespace-pre-wrap">{c.notes}</p>
                    </div>
                  )}
                </div>

                <div className="md:w-48 flex flex-col gap-3">
                  <form action={updateConsultationStatus}>
                    <input type="hidden" name="id" value={c.id} />
                    <label className="field-label">Status</label>
                    <select
                      name="status"
                      defaultValue={c.status}
                      className="field-input mb-3"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="w-full inline-flex h-10 items-center justify-center app-btn app-btn-primary"
                    >
                      Update
                    </button>
                  </form>
                  <form action={convertConsultationToProject}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConvertToProjectButton
                      label="Convert to Project →"
                      confirmText={`Create a project from ${c.first_name} ${c.last_name}'s consultation?`}
                      className="app-btn app-btn-accent w-full"
                    />
                  </form>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-ink/10 text-xs text-stone-300 font-mono">
                Requested {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-ink/15 p-16 text-center bg-paper">
          <p className="text-ink/50 italic">No consultation requests yet.</p>
        </div>
      )}
    </div>
  );
}
