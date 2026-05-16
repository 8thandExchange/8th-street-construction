import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const STATUS_COLORS: Record<string, string> = {
  requested: "border-copper/50 text-copper bg-copper/5",
  confirmed: "border-emerald-500/50 text-emerald-600 bg-emerald-50",
  completed: "border-blue-500/50 text-blue-600",
  cancelled: "border-stone-300 text-stone-300",
  no_show: "border-amber-500/50 text-amber-600",
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
    <div className="p-8 md:p-12">
      <div className="mb-10">
        <span className="eyebrow">— Bookings</span>
        <h1 className="mt-2 font-display text-display-md text-ink">Consultations</h1>
      </div>

      {consultations && consultations.length > 0 ? (
        <div className="space-y-4">
          {consultations.map((c) => (
            <div key={c.id} className="bg-paper border border-ink/15 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-display text-2xl text-ink">
                      {c.first_name} {c.last_name}
                    </h3>
                    <span
                      className={`inline-block text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border ${STATUS_COLORS[c.status]}`}
                    >
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

                <form action={updateConsultationStatus} className="md:w-48">
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
                    className="w-full inline-flex h-10 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
                  >
                    Update
                  </button>
                </form>
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
