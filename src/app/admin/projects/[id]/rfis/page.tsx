import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { createRfi, setRfiStatus } from "@/lib/actions/rfis";
import { createSubmittal, decideSubmittal } from "@/lib/actions/submittals";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

const RFI_BADGE: Record<string, string> = {
  draft: "app-badge-neutral",
  open: "app-badge-amber",
  answered: "app-badge-blue",
  closed: "app-badge-green",
  void: "app-badge-red",
};

const SUB_BADGE: Record<string, string> = {
  draft: "app-badge-neutral",
  submitted: "app-badge-amber",
  in_review: "app-badge-blue",
  approved: "app-badge-green",
  approved_as_noted: "app-badge-green",
  rejected: "app-badge-red",
  void: "app-badge-red",
};

export default async function ProjectRfisPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const [{ data: rfis }, { data: submittals }, { data: planSets }, { data: milestones }, { data: docs }] =
    await Promise.all([
      supabase.from("project_rfis").select("*").eq("project_id", id).order("number", { ascending: false }),
      supabase
        .from("project_submittals")
        .select("*")
        .eq("project_id", id)
        .order("number", { ascending: false }),
      supabase.from("project_plan_sets").select("id, title, version").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("project_milestones").select("id, title").eq("project_id", id).order("display_order"),
      supabase
        .from("project_documents")
        .select("id, title")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h2 className="app-h2">RFIs and submittals</h2>
        <p className="mt-2 text-sm app-muted max-w-2xl">
          Questions and product packages for {project.title}. An RFI is not closed until the
          answer is on the record. A submittal is not released until someone decides.
        </p>
      </div>

      <section className="app-card p-6 space-y-4">
        <h3 className="app-h2 !text-[16px]">New RFI</h3>
        <form action={createRfi} className="space-y-4">
          <input type="hidden" name="project_id" value={id} />
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div>
              <label className="field-label">Title *</label>
              <input name="title" required className="field-input" placeholder="Window header at south elevation" />
            </div>
            <div>
              <label className="field-label">Trade</label>
              <input name="trade" className="field-input" placeholder="Framing" />
            </div>
          </div>
          <div>
            <label className="field-label">Question *</label>
            <textarea name="question" required rows={4} className="field-input" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="field-label">Plan set</label>
              <select name="plan_set_id" className="field-input" defaultValue="">
                <option value="">— none —</option>
                {(planSets ?? []).map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title} {set.version ? `v${set.version}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Schedule phase</label>
              <select name="milestone_id" className="field-input" defaultValue="">
                <option value="">— none —</option>
                {(milestones ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Schedule impact</label>
              <select name="schedule_impact" className="field-input" defaultValue="none">
                <option value="none">None</option>
                <option value="possible">Possible</option>
                <option value="likely">Likely</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Days of impact (if known)</label>
            <input name="days_impact" type="number" min="0" className="field-input max-w-[180px]" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="send_to_client" defaultChecked className="accent-copper" />
            Send to the client now
          </label>
          <SubmitButton>Create RFI</SubmitButton>
        </form>
      </section>

      <ul className="space-y-4">
        {(rfis ?? []).map((rfi) => (
          <li key={rfi.id} className="app-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs app-muted">#{rfi.number}</span>
              <h3 className="app-h2 !text-[15px]">{rfi.title}</h3>
              <span className={`app-badge ${RFI_BADGE[rfi.status] ?? "app-badge-neutral"}`}>{rfi.status}</span>
              {rfi.trade && <span className="text-xs app-muted">{rfi.trade}</span>}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-navy/80">{rfi.question}</p>
            {rfi.answer && (
              <p className="mt-3 app-inset p-3 text-sm">
                <span className="app-label">Answer</span>
                <span className="mt-1 block whitespace-pre-wrap">{rfi.answer}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {rfi.status === "draft" && (
                <form action={setRfiStatus}>
                  <input type="hidden" name="id" value={rfi.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="status" value="open" />
                  <SubmitButton className="app-btn app-btn-secondary !h-8 !text-xs">Send to client</SubmitButton>
                </form>
              )}
              {rfi.status === "answered" && (
                <form action={setRfiStatus}>
                  <input type="hidden" name="id" value={rfi.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="status" value="closed" />
                  <SubmitButton className="app-btn app-btn-primary !h-8 !text-xs">Close RFI</SubmitButton>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="app-card p-6 space-y-4">
        <h3 className="app-h2 !text-[16px]">New submittal</h3>
        <form action={createSubmittal} className="space-y-4">
          <input type="hidden" name="project_id" value={id} />
          <div className="grid gap-4 md:grid-cols-[1fr_160px_160px]">
            <div>
              <label className="field-label">Title *</label>
              <input name="title" required className="field-input" placeholder="Andersen 100 series windows" />
            </div>
            <div>
              <label className="field-label">Trade</label>
              <input name="trade" className="field-input" />
            </div>
            <div>
              <label className="field-label">Spec section</label>
              <input name="spec_section" className="field-input" placeholder="08 50 00" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="field-label">Linked file</label>
              <select name="document_id" className="field-input" defaultValue="">
                <option value="">— none —</option>
                {(docs ?? []).map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Plan set</label>
              <select name="plan_set_id" className="field-input" defaultValue="">
                <option value="">— none —</option>
                {(planSets ?? []).map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title} {set.version ? `v${set.version}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Due</label>
              <input type="date" name="due_date" className="field-input" />
            </div>
          </div>
          <textarea name="notes" rows={3} className="field-input" placeholder="What needs review" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="submit_now" defaultChecked className="accent-copper" />
            Mark submitted for review
          </label>
          <SubmitButton>Create submittal</SubmitButton>
        </form>
      </section>

      <ul className="space-y-4">
        {(submittals ?? []).map((row) => (
          <li key={row.id} className="app-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs app-muted">#{row.number}</span>
              <h3 className="app-h2 !text-[15px]">{row.title}</h3>
              <span className={`app-badge ${SUB_BADGE[row.status] ?? "app-badge-neutral"}`}>
                {row.status.replaceAll("_", " ")}
              </span>
            </div>
            {row.notes && <p className="mt-2 text-sm text-navy/75">{row.notes}</p>}
            {row.status === "draft" && (
              <form action={decideSubmittal} className="mt-4">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="status" value="submitted" />
                <SubmitButton className="app-btn app-btn-secondary !h-8 !text-xs">
                  Submit for review
                </SubmitButton>
              </form>
            )}
            {["submitted", "in_review"].includes(row.status) && (
              <form action={decideSubmittal} className="mt-4 space-y-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="project_id" value={id} />
                <textarea name="reviewer_notes" rows={2} className="field-input" placeholder="Review notes" />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" name="status" value="approved" className="app-btn app-btn-primary !h-8 !text-xs">
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="approved_as_noted"
                    className="app-btn app-btn-secondary !h-8 !text-xs"
                  >
                    Approve as noted
                  </button>
                  <button type="submit" name="status" value="rejected" className="app-btn app-btn-ghost !h-8 !text-xs">
                    Reject
                  </button>
                </div>
              </form>
            )}
            {row.reviewer_notes && (
              <p className="mt-3 text-xs app-muted">Decision note: {row.reviewer_notes}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
