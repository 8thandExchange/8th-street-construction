import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  full: "Full",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "border-emerald-500/50 text-emerald-600 bg-emerald-50",
  full: "border-copper/50 text-copper bg-copper/5",
  completed: "border-blue-500/50 text-blue-600",
  cancelled: "border-stone-300 text-stone-300",
};

function revalidateVolunteer() {
  revalidatePath("/admin/volunteer");
  revalidatePath("/volunteer");
}

async function createEvent(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.from("volunteer_events").insert({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    event_date: String(formData.get("event_date")),
    start_time: String(formData.get("start_time") || "08:00"),
    end_time: String(formData.get("end_time") || "15:00"),
    capacity: Number(formData.get("capacity") || 20),
    signup_deadline: String(formData.get("signup_deadline") || "") || null,
    what_to_bring: String(formData.get("what_to_bring") ?? "").trim() || null,
    skills_needed: String(formData.get("skills_needed") ?? "").trim() || null,
    published: formData.get("published") === "on",
  });
  if (error) throw new Error(error.message);
  revalidateVolunteer();
}

async function updateEventStatus(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const published = formData.get("published") === "on";
  const { error } = await supabase
    .from("volunteer_events")
    .update({ status, published })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateVolunteer();
}

async function updateSignupStatus(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const { error } = await supabase
    .from("volunteer_signups")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateVolunteer();
}

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminVolunteer() {
  const supabase = await createClient();
  const [{ data: events }, { data: signups }] = await Promise.all([
    supabase.from("volunteer_events").select("*").order("event_date", { ascending: true }),
    supabase
      .from("volunteer_signups")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const byEvent = new Map<string, NonNullable<typeof signups>>();
  for (const s of signups ?? []) {
    const list = byEvent.get(s.event_id) ?? [];
    list.push(s);
    byEvent.set(s.event_id, list);
  }

  return (
    <div className="p-8 md:p-12">
      <div className="mb-10">
        <span className="eyebrow">— Community Program</span>
        <h1 className="mt-2 font-display text-display-md text-ink">Volunteer Build Days</h1>
        <p className="mt-3 text-sm text-ink/60 max-w-2xl">
          Publish build days at least four weeks out so Habitat coordinators and volunteer groups
          can plan. Confirmed volunteers are emailed automatically; send site details one week
          before, and a reminder 48 hours out.
        </p>
      </div>

      {/* Create */}
      <div className="bg-paper border border-ink/15 p-6 md:p-8 mb-12">
        <h2 className="font-display text-2xl text-ink mb-6">Schedule a Build Day</h2>
        <form action={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="field-label">Title</label>
            <input name="title" required className="field-input" placeholder="Wall Raising — Build Day" />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Description</label>
            <textarea name="description" rows={2} className="field-input" placeholder="What volunteers will do that day" />
          </div>
          <div>
            <label className="field-label">Date</label>
            <input name="event_date" type="date" required className="field-input" />
          </div>
          <div>
            <label className="field-label">Signups Close</label>
            <input name="signup_deadline" type="date" className="field-input" />
          </div>
          <div>
            <label className="field-label">Start</label>
            <input name="start_time" type="time" defaultValue="08:00" className="field-input" />
          </div>
          <div>
            <label className="field-label">End</label>
            <input name="end_time" type="time" defaultValue="15:00" className="field-input" />
          </div>
          <div>
            <label className="field-label">Capacity</label>
            <input name="capacity" type="number" min={1} defaultValue={20} className="field-input" />
          </div>
          <div>
            <label className="field-label">Location</label>
            <input name="location" className="field-input" placeholder="Augusta, GA (address sent with confirmation)" />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">What to Bring</label>
            <input name="what_to_bring" className="field-input" placeholder="Closed-toe shoes, water bottle…" />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Skills Needed</label>
            <input name="skills_needed" className="field-input" placeholder="No experience needed" />
          </div>
          <div className="md:col-span-2 flex items-center justify-between gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-ink/80">
              <input type="checkbox" name="published" defaultChecked className="accent-copper" />
              Publish to the site immediately
            </label>
            <button
              type="submit"
              className="inline-flex h-11 px-8 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
            >
              Schedule Build Day
            </button>
          </div>
        </form>
      </div>

      {/* Events + rosters */}
      {events && events.length > 0 ? (
        <div className="space-y-6">
          {events.map((e) => {
            const roster = byEvent.get(e.id) ?? [];
            const confirmed = roster.filter((s) => s.status === "confirmed");
            const waitlist = roster.filter((s) => s.status === "waitlist");
            const filled = confirmed.reduce((n, s) => n + (s.group_size ?? 1), 0);
            return (
              <div key={e.id} className="bg-paper border border-ink/15 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-display text-2xl text-ink">{e.title}</h3>
                      <span
                        className={`inline-block text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border ${STATUS_COLORS[e.status]}`}
                      >
                        {STATUS_LABELS[e.status]}
                      </span>
                      {!e.published && (
                        <span className="inline-block text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border border-stone-300 text-stone-300">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-ink/70">
                      {fmtDate(e.event_date)} · {String(e.start_time).slice(0, 5)}–{String(e.end_time).slice(0, 5)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                    <div className="mt-2 font-mono text-xs text-ink/50">
                      {filled} / {e.capacity} confirmed
                      {waitlist.length > 0 && ` · ${waitlist.length} on waitlist`}
                      {e.signup_deadline && ` · signups close ${fmtDate(e.signup_deadline)}`}
                    </div>
                  </div>

                  <form action={updateEventStatus} className="md:w-52 shrink-0">
                    <input type="hidden" name="id" value={e.id} />
                    <label className="field-label">Status</label>
                    <select name="status" defaultValue={e.status} className="field-input mb-2">
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs text-ink/70 mb-3">
                      <input type="checkbox" name="published" defaultChecked={e.published} className="accent-copper" />
                      Published
                    </label>
                    <button
                      type="submit"
                      className="w-full inline-flex h-10 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
                    >
                      Update
                    </button>
                  </form>
                </div>

                {roster.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-ink/10">
                    <div className="eyebrow mb-3">Roster</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left font-mono text-[10px] tracking-[0.15em] uppercase text-stone-300">
                            <th className="py-2 pr-4 font-normal">Name</th>
                            <th className="py-2 pr-4 font-normal">Contact</th>
                            <th className="py-2 pr-4 font-normal">Group</th>
                            <th className="py-2 pr-4 font-normal">Experience</th>
                            <th className="py-2 pr-4 font-normal">Status</th>
                            <th className="py-2 font-normal" />
                          </tr>
                        </thead>
                        <tbody>
                          {roster.map((s) => (
                            <tr key={s.id} className="border-t border-ink/[0.07]">
                              <td className="py-2.5 pr-4 text-ink">
                                {s.first_name} {s.last_name}
                                {s.notes && (
                                  <div className="text-xs text-ink/50 mt-0.5 max-w-[280px]">{s.notes}</div>
                                )}
                              </td>
                              <td className="py-2.5 pr-4">
                                <a href={`mailto:${s.email}`} className="text-copper editorial-link">{s.email}</a>
                                {s.phone && <div className="text-xs text-ink/60">{s.phone}</div>}
                              </td>
                              <td className="py-2.5 pr-4 text-ink">{s.group_size}</td>
                              <td className="py-2.5 pr-4 text-ink/70 capitalize">
                                {s.experience_level?.replace(/_/g, " ") ?? "—"}
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/60">
                                  {s.status}
                                </span>
                              </td>
                              <td className="py-2.5">
                                <form action={updateSignupStatus} className="flex items-center gap-2">
                                  <input type="hidden" name="id" value={s.id} />
                                  <select name="status" defaultValue={s.status} className="field-input !h-8 !py-0 text-xs w-28">
                                    <option value="confirmed">Confirmed</option>
                                    <option value="waitlist">Waitlist</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                  <button
                                    type="submit"
                                    className="h-8 px-3 bg-ink text-bone hover:bg-copper font-mono text-[9px] tracking-[0.15em] uppercase transition-colors"
                                  >
                                    Save
                                  </button>
                                </form>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-ink/15 p-16 text-center bg-paper">
          <p className="text-ink/50 italic">No build days scheduled yet.</p>
        </div>
      )}
    </div>
  );
}
