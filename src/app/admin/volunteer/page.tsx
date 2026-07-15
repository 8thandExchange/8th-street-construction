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
    external_signup_url: String(formData.get("external_signup_url") ?? "").trim() || null,
    published: formData.get("published") === "on",
  });
  if (error) throw new Error(error.message);
  revalidateVolunteer();
}

async function updateEvent(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("volunteer_events")
    .update({
      status: String(formData.get("status")),
      published: formData.get("published") === "on",
      external_signup_url:
        String(formData.get("external_signup_url") ?? "").trim() || null,
      signup_deadline: String(formData.get("signup_deadline") || "") || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateVolunteer();
}

async function deleteEvent(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase
    .from("volunteer_events")
    .delete()
    .eq("id", String(formData.get("id")));
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
  const { data: events } = await supabase
    .from("volunteer_events")
    .select("*")
    .order("event_date", { ascending: true });

  const upcoming = (events ?? []).filter((e) => e.status !== "completed" && e.status !== "cancelled");

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl">
      <div className="mb-10">
        <span className="eyebrow">— Community Program</span>
        <h1 className="mt-2 app-h1">Volunteer Build Days</h1>
        <p className="mt-3 text-sm text-ink/60 max-w-2xl">
          Registration is <strong>Habitat-controlled</strong>: publish each build day at least four
          weeks out, then paste Habitat&apos;s registration link (VolunteerHub or similar) into the
          event. The public page routes every volunteer to that link — waivers, rosters, and
          capacity live with Habitat.
        </p>
      </div>

      {/* Create */}
      <form
        action={createEvent}
        className="bg-paper border border-ink/15 p-8 mb-10 flex flex-col gap-5"
      >
        <h2 className="eyebrow">Schedule a Build Day</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="field-label">Title *</label>
            <input name="title" required className="field-input" placeholder="Wall Raising — Build Day" />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Description</label>
            <textarea name="description" rows={2} className="field-input py-3 resize-none" placeholder="What volunteers will do that day" />
          </div>
          <div>
            <label className="field-label">Date *</label>
            <input name="event_date" type="date" required className="field-input" />
          </div>
          <div>
            <label className="field-label">Registration Closes</label>
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
            <label className="field-label">Crew Size</label>
            <input name="capacity" type="number" min={1} defaultValue={20} className="field-input" />
          </div>
          <div>
            <label className="field-label">Location</label>
            <input name="location" className="field-input" placeholder="Augusta, GA (address provided at registration)" />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Habitat Registration URL</label>
            <input
              name="external_signup_url"
              type="url"
              className="field-input"
              placeholder="https://…volunteerhub.com/… (leave blank until Habitat posts the event)"
            />
          </div>
          <div>
            <label className="field-label">What to Bring</label>
            <input name="what_to_bring" className="field-input" placeholder="Closed-toe shoes, water bottle…" />
          </div>
          <div>
            <label className="field-label">Skills Needed</label>
            <input name="skills_needed" className="field-input" placeholder="No experience needed" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="published" defaultChecked className="w-5 h-5 accent-copper" />
            <span className="text-sm text-ink">Publish to the site immediately</span>
          </label>
          <button
            type="submit"
            className="inline-flex h-11 px-8 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
          >
            Schedule Build Day
          </button>
        </div>
      </form>

      {/* Events */}
      {events && events.length > 0 ? (
        <div className="space-y-6">
          {events.map((e) => (
            <div key={e.id} className="bg-paper border border-ink/15 p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
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
                    {fmtDate(e.event_date)} · {String(e.start_time).slice(0, 5)}–
                    {String(e.end_time).slice(0, 5)}
                    {e.location ? ` · ${e.location}` : ""} · crew of {e.capacity}
                  </div>
                  <div className="mt-2 font-mono text-xs text-ink/50 break-all">
                    {e.external_signup_url ? (
                      <a
                        href={e.external_signup_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-copper editorial-link"
                      >
                        {e.external_signup_url}
                      </a>
                    ) : (
                      <span className="text-amber-600">
                        No Habitat registration link yet — public page falls back to email
                      </span>
                    )}
                  </div>
                </div>

                <form action={updateEvent} className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
                  <input type="hidden" name="id" value={e.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Status</label>
                      <select name="status" defaultValue={e.status} className="field-input">
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Reg. Closes</label>
                      <input
                        name="signup_deadline"
                        type="date"
                        defaultValue={e.signup_deadline ?? ""}
                        className="field-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Habitat Registration URL</label>
                    <input
                      name="external_signup_url"
                      type="url"
                      defaultValue={e.external_signup_url ?? ""}
                      className="field-input"
                      placeholder="https://…"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-ink/70 cursor-pointer">
                      <input
                        type="checkbox"
                        name="published"
                        defaultChecked={e.published}
                        className="w-4 h-4 accent-copper"
                      />
                      Published
                    </label>
                    <button
                      type="submit"
                      className="inline-flex h-9 px-5 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>

              {(e.status === "completed" || e.status === "cancelled") && (
                <form action={deleteEvent} className="mt-4 pt-4 border-t border-ink/10">
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono tracking-[0.15em] uppercase text-stone-300 hover:text-red-600 transition-colors"
                  >
                    Delete event
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-ink/15 p-16 text-center bg-paper">
          <p className="text-ink/50 italic">No build days scheduled yet.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <p className="mt-8 text-xs text-ink/50 max-w-2xl">
          Coordinator rhythm: publish ≥4 weeks out → confirm the Habitat registration link is
          attached → Habitat emails registrants details one week out and reminders 48 hours
          before. Mark a day <em>Full</em> when Habitat says so; the public page then points
          volunteers at Habitat&apos;s waitlist.
        </p>
      )}
    </div>
  );
}
