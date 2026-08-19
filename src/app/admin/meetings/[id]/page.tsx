import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionItemCard } from "@/components/admin/meetings/ActionItemCard";
import { EmailMinutesButton } from "@/components/admin/meetings/EmailMinutesButton";
import {
  addActionItemForm,
  addDecision,
  approveMinutes,
  deleteAttendee,
  deleteDecision,
  reopenMinutes,
  saveAgendaItem,
  saveAttendee,
  updateMeetingBasics,
} from "@/lib/actions/meetings";
import { getMeetingDetail } from "@/lib/meetings/queries";
import { formatMeetingDate, renderMinutesMarkdown } from "@/lib/meetings/minutes-format";
import { ATTENDEE_ROLES, MEETING_STATUS_LABELS } from "@/lib/meetings/types";
import { appStatusBadge } from "@/lib/project/status-badges";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { ActionItemWithContext } from "@/lib/meetings/queries";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const detail = await getMeetingDetail(supabase, id);
  if (!detail) notFound();

  const { meeting, attendees, agendaItems, decisions, actionItems, updatesByAction } = detail;
  const locked = meeting.status === "approved";

  const { data: projectRows } = await supabase.from("projects").select("id, title").order("title");
  const projects = (projectRows ?? []) as { id: string; title: string }[];

  const minutes = meeting.approved_snapshot || renderMinutesMarkdown(detail);
  const seen = new Set<string>();
  const recipients = attendees.flatMap((a) => {
    const email = a.email?.trim();
    if (!email || seen.has(email)) return [];
    seen.add(email);
    return [{ name: a.name, email }];
  });

  return (
    <div className="max-w-4xl space-y-8 p-4 md:p-8 lg:p-10">
      <div>
        <Link
          href="/admin/meetings"
          className="text-[13px] font-medium text-copper hover:underline"
        >
          ← Meetings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="app-h1">{meeting.title}</h2>
          <span className={appStatusBadge("meeting", meeting.status)}>
            {MEETING_STATUS_LABELS[meeting.status]}
          </span>
        </div>
        <p className="mt-2 text-sm app-muted">
          {formatMeetingDate(meeting.meeting_date)}
          {meeting.location ? ` · ${meeting.location}` : ""}
          {meeting.source_reference ? ` · ${meeting.source_reference}` : ""}
        </p>
        {meeting.summary && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">{meeting.summary}</p>
        )}
      </div>

      {locked && (
        <div className="app-card border-l-2 border-l-emerald-600 p-5">
          <div className="text-sm font-medium text-navy">
            These minutes are approved and locked.
          </div>
          <p className="mt-1 text-sm app-muted">
            Approved{" "}
            {meeting.approved_at
              ? new Date(meeting.approved_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : ""}
            . The text below is the frozen record. To correct it you have to reopen it with a
            reason, and that reason stays on the file.
          </p>
          <form
            action={async (fd: FormData) => {
              "use server";
              await reopenMinutes(fd);
            }}
            className="mt-4 flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="id" value={meeting.id} />
            <div className="min-w-[260px] flex-1">
              <label className="app-label" htmlFor="reopen-reason">
                Reason for reopening
              </label>
              <input id="reopen-reason" name="reason" required className="mt-1 w-full" />
            </div>
            <SubmitButton className="app-btn app-btn-secondary">Reopen</SubmitButton>
          </form>
        </div>
      )}

      {meeting.reopen_reason && !locked && (
        <div className="app-card border-l-2 border-l-amber-500 p-5 text-sm">
          <span className="font-medium text-navy">Reopened after approval.</span>{" "}
          <span className="app-muted">{meeting.reopen_reason}</span>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <h3 className="app-h2 !text-[16px]">Who was there</h3>
        <div className="app-card divide-y divide-navy/[0.06]">
          {attendees.length === 0 && (
            <p className="p-5 text-sm italic app-muted">No attendees recorded.</p>
          )}
          {attendees.map((a) => (
            <details key={a.id} className="p-0">
              <summary
                className={`flex items-center justify-between gap-3 p-4 ${
                  locked ? "pointer-events-none" : "cursor-pointer list-none"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-navy">{a.name}</span>
                  {(a.organization || a.email) && (
                    <span className="block truncate text-xs app-muted">
                      {[a.organization, a.email].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {!a.email && (
                    <span className="block text-[11px] italic text-rust/80">
                      No email on file — won&apos;t receive circulated minutes
                    </span>
                  )}
                </span>
                <span className="app-badge app-badge-neutral shrink-0">
                  {a.present ? a.role : "apology"}
                </span>
              </summary>
              {!locked && (
                <div className="border-t border-navy/[0.06] p-4">
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await saveAttendee(fd);
                    }}
                    className="grid gap-4 md:grid-cols-2"
                  >
                    <input type="hidden" name="meeting_id" value={meeting.id} />
                    <input type="hidden" name="id" value={a.id} />
                    <div>
                      <label className="app-label">Name</label>
                      <input name="name" defaultValue={a.name} required className="mt-1 w-full" />
                    </div>
                    <div>
                      <label className="app-label">Email</label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={a.email ?? ""}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="app-label">Organization</label>
                      <input
                        name="organization"
                        defaultValue={a.organization ?? ""}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="app-label">Role</label>
                      <select name="role" defaultValue={a.role} className="mt-1 w-full">
                        {ATTENDEE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-navy md:col-span-2">
                      <input type="checkbox" name="present" defaultChecked={a.present} />
                      Was present
                    </label>
                    <div className="md:col-span-2">
                      <SubmitButton>Save</SubmitButton>
                    </div>
                  </form>
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await deleteAttendee(fd);
                    }}
                    className="mt-2"
                  >
                    <input type="hidden" name="meeting_id" value={meeting.id} />
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton className="app-btn app-btn-ghost">
                      Remove from meeting
                    </SubmitButton>
                  </form>
                </div>
              )}
            </details>
          ))}
        </div>

        {!locked && (
          <form
            action={async (fd: FormData) => {
              "use server";
              await saveAttendee(fd);
            }}
            className="app-card grid gap-4 p-5 md:grid-cols-4"
          >
            <input type="hidden" name="meeting_id" value={meeting.id} />
            <div>
              <label className="app-label">Add an attendee</label>
              <input name="name" required placeholder="Name" className="mt-1 w-full" />
            </div>
            <div>
              <label className="app-label">Email</label>
              <input type="email" name="email" className="mt-1 w-full" />
            </div>
            <div>
              <label className="app-label">Organization</label>
              <input name="organization" className="mt-1 w-full" />
            </div>
            <div>
              <label className="app-label">Role</label>
              <select name="role" defaultValue="attendee" className="mt-1 w-full">
                {ATTENDEE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <input type="hidden" name="present" value="on" />
            <div className="md:col-span-4">
              <SubmitButton className="app-btn app-btn-secondary">Add</SubmitButton>
            </div>
          </form>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <h3 className="app-h2 !text-[16px]">Agenda &amp; discussion</h3>
        {agendaItems.length === 0 && (
          <div className="app-card p-5 text-sm italic app-muted">No agenda items yet.</div>
        )}
        {agendaItems.map((item) => (
          <details key={item.id} className="app-card p-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
              <span className="min-w-0">
                <span className="block text-[15px] text-navy">
                  {[item.number, item.title].filter(Boolean).join(". ")}
                </span>
                {item.notes_md && (
                  <span className="mt-1 block whitespace-pre-wrap text-[13px] leading-relaxed app-muted">
                    {item.notes_md}
                  </span>
                )}
              </span>
              <span className="app-badge app-badge-neutral shrink-0">{item.status}</span>
            </summary>
            {!locked && (
              <form
                action={async (fd: FormData) => {
                  "use server";
                  await saveAgendaItem(fd);
                }}
                className="grid gap-4 border-t border-navy/[0.06] p-5"
              >
                <input type="hidden" name="meeting_id" value={meeting.id} />
                <input type="hidden" name="id" value={item.id} />
                <div className="grid gap-4 md:grid-cols-[100px_1fr_140px]">
                  <div>
                    <label className="app-label">Number</label>
                    <input name="number" defaultValue={item.number ?? ""} className="mt-1 w-full" />
                  </div>
                  <div>
                    <label className="app-label">Heading</label>
                    <input
                      name="title"
                      defaultValue={item.title}
                      required
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="app-label">Status</label>
                    <select name="status" defaultValue={item.status} className="mt-1 w-full">
                      <option value="closed">Closed</option>
                      <option value="open">Open</option>
                      <option value="carried">Carry forward</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="app-label">What was said</label>
                  <textarea
                    name="notes_md"
                    rows={4}
                    defaultValue={item.notes_md ?? ""}
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <SubmitButton>Save</SubmitButton>
                </div>
              </form>
            )}
          </details>
        ))}

        {!locked && (
          <form
            action={async (fd: FormData) => {
              "use server";
              await saveAgendaItem(fd);
            }}
            className="app-card grid gap-4 p-5 md:grid-cols-[100px_1fr_auto]"
          >
            <input type="hidden" name="meeting_id" value={meeting.id} />
            <div>
              <label className="app-label">Number</label>
              <input name="number" className="mt-1 w-full" />
            </div>
            <div>
              <label className="app-label">Add an agenda item</label>
              <input name="title" required className="mt-1 w-full" />
            </div>
            <div className="flex items-end">
              <SubmitButton className="app-btn app-btn-secondary">Add</SubmitButton>
            </div>
          </form>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <h3 className="app-h2 !text-[16px]">Decisions</h3>
        <div className="app-card divide-y divide-navy/[0.06]">
          {decisions.length === 0 && (
            <p className="p-5 text-sm italic app-muted">
              Nothing recorded. Decisions are the part an auditor, a lender, or a partner actually
              reads — write them out in full.
            </p>
          )}
          {decisions.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-navy">{d.decision}</p>
                {d.rationale && <p className="mt-1 text-xs app-muted">{d.rationale}</p>}
              </div>
              {!locked && (
                <form
                  action={async (fd: FormData) => {
                    "use server";
                    await deleteDecision(fd);
                  }}
                >
                  <input type="hidden" name="meeting_id" value={meeting.id} />
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton className="app-btn app-btn-ghost shrink-0">
                    Remove
                  </SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>

        {!locked && (
          <form
            action={async (fd: FormData) => {
              "use server";
              await addDecision(fd);
            }}
            className="app-card grid gap-4 p-5"
          >
            <input type="hidden" name="meeting_id" value={meeting.id} />
            <div>
              <label className="app-label" htmlFor="decision">
                Record a decision
              </label>
              <textarea
                id="decision"
                name="decision"
                rows={2}
                required
                placeholder="e.g. All four upcoming Habitat houses will be coordinated by 8th Street."
                className="mt-1 w-full"
              />
            </div>
            <div>
              <SubmitButton className="app-btn app-btn-secondary">
                Add decision
              </SubmitButton>
            </div>
          </form>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <h3 className="app-h2 !text-[16px]">Action items</h3>
        {actionItems.length === 0 && (
          <div className="app-card p-5 text-sm italic app-muted">
            Nothing came out of this meeting yet.
          </div>
        )}
        {actionItems.map((item) => (
          <ActionItemCard
            key={item.id}
            item={
              {
                ...item,
                meeting: { id: meeting.id, title: meeting.title, meeting_date: meeting.meeting_date },
                project: projects.find((p) => p.id === item.project_id) ?? null,
                latest_update: updatesByAction[item.id]?.[0] ?? null,
              } as ActionItemWithContext
            }
            updates={updatesByAction[item.id] ?? []}
            projects={projects}
            showMeeting={false}
          />
        ))}

        <form
          action={async (fd: FormData) => {
            "use server";
            await addActionItemForm(fd);
          }}
          className="app-card grid gap-4 p-5 md:grid-cols-4"
        >
          <input type="hidden" name="meeting_id" value={meeting.id} />
          <div className="md:col-span-2">
            <label className="app-label">Add an action item</label>
            <input name="title" required className="mt-1 w-full" />
          </div>
          <div>
            <label className="app-label">Owner</label>
            <input name="owner_name" className="mt-1 w-full" />
          </div>
          <div>
            <label className="app-label">Due</label>
            <input type="date" name="due_date" className="mt-1 w-full" />
          </div>
          <div className="md:col-span-4">
            <SubmitButton className="app-btn app-btn-secondary">Add</SubmitButton>
          </div>
        </form>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <h3 className="app-h2 !text-[16px]">The minutes</h3>
        <div className="app-card p-6">
          <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink/80">
            {minutes}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          {!locked && (
            <form
              action={async (fd: FormData) => {
                "use server";
                await approveMinutes(fd);
              }}
            >
              <input type="hidden" name="id" value={meeting.id} />
              <SubmitButton className="app-btn app-btn-accent">
                Approve &amp; lock
              </SubmitButton>
            </form>
          )}
          <EmailMinutesButton meetingId={meeting.id} recipients={recipients} />
          <a
            href={`/api/meetings/${meeting.id}/docx`}
            className="app-btn app-btn-secondary"
            download
          >
            Download for Word
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {!locked && (
        <section className="space-y-3">
          <h3 className="app-h2 !text-[16px]">Meeting details</h3>
          <form
            action={async (fd: FormData) => {
              "use server";
              await updateMeetingBasics(fd);
            }}
            className="app-card grid gap-4 p-5 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={meeting.id} />
            <div>
              <label className="app-label">Title</label>
              <input name="title" defaultValue={meeting.title} required className="mt-1 w-full" />
            </div>
            <div>
              <label className="app-label">Date</label>
              <input
                type="date"
                name="meeting_date"
                defaultValue={meeting.meeting_date}
                required
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="app-label">Location</label>
              <input name="location" defaultValue={meeting.location ?? ""} className="mt-1 w-full" />
            </div>
            <div>
              <label className="app-label">Next meeting</label>
              <input
                type="date"
                name="next_meeting_date"
                defaultValue={meeting.next_meeting_date ?? ""}
                className="mt-1 w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="app-label">Summary</label>
              <textarea
                name="summary"
                rows={3}
                defaultValue={meeting.summary ?? ""}
                className="mt-1 w-full"
              />
            </div>
            <div className="md:col-span-2">
              <SubmitButton>Save</SubmitButton>
            </div>
          </form>
        </section>
      )}

      {meeting.raw_notes && (
        <details className="app-card p-5">
          <summary className="cursor-pointer list-none text-sm font-medium text-navy">
            Original notes, as received
          </summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed app-muted">
            {meeting.raw_notes}
          </pre>
        </details>
      )}
    </div>
  );
}
