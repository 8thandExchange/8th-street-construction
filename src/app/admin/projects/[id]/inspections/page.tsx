import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  createInspection,
  deleteInspection,
  resultInspection,
} from "@/lib/actions/inspections";

export const dynamic = "force-dynamic";

type InspectionRow = {
  id: string;
  title: string;
  trade: string | null;
  inspector: string | null;
  scheduled_date: string | null;
  status: "scheduled" | "passed" | "failed" | "waived";
  result_notes: string | null;
  resulted_at: string | null;
  reinspection_of: string | null;
};

const STATUS_TONES: Record<InspectionRow["status"], string> = {
  scheduled: "border-sky-300 text-sky-800 bg-sky-50",
  passed: "border-emerald-300 text-emerald-800 bg-emerald-50",
  failed: "border-red-300 text-red-800 bg-red-50",
  waived: "border-ink/20 text-ink/60 bg-bone/40",
};

async function createInspectionAction(formData: FormData) {
  "use server";
  await createInspection(formData);
}

async function resultInspectionAction(formData: FormData) {
  "use server";
  await resultInspection(formData);
}

async function deleteInspectionAction(formData: FormData) {
  "use server";
  await deleteInspection(formData);
}

function fmtDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProjectInspectionsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data } = await supabase
    .from("project_inspections")
    .select("*")
    .eq("project_id", id)
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const inspections = (data ?? []) as InspectionRow[];
  const byId = new Map(inspections.map((i) => [i.id, i]));
  const open = inspections.filter((i) => i.status === "scheduled");
  const resulted = inspections.filter((i) => i.status !== "scheduled");

  const card = (i: InspectionRow) => (
    <li key={i.id} className="app-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-[15px] text-navy">{i.title}</h3>
        <span
          className={`border px-2 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_TONES[i.status]}`}
        >
          {i.status}
        </span>
      </div>
      <p className="mt-1 text-xs app-muted">
        {[
          i.trade,
          i.inspector && `Inspector: ${i.inspector}`,
          i.scheduled_date && `Scheduled ${fmtDate(i.scheduled_date)}`,
          i.resulted_at &&
            `Resulted ${new Date(i.resulted_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`,
          i.reinspection_of &&
            `Retest of: ${byId.get(i.reinspection_of)?.title ?? "earlier inspection"}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {i.result_notes && (
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{i.result_notes}</p>
      )}

      {i.status === "scheduled" && (
        <div className="mt-4 space-y-3">
          <form action={resultInspectionAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={id} />
            <input type="hidden" name="id" value={i.id} />
            <div className="min-w-[240px] flex-1">
              <label className="app-label">Result notes</label>
              <input
                name="result_notes"
                placeholder="What the inspector said"
                className="mt-1 w-full"
              />
            </div>
            <button
              type="submit"
              name="status"
              value="passed"
              className="app-btn app-btn-secondary"
            >
              Passed
            </button>
            <button type="submit" name="status" value="failed" className="app-btn">
              Failed
            </button>
            <button type="submit" name="status" value="waived" className="app-btn app-btn-ghost">
              Waived
            </button>
          </form>
          <form action={deleteInspectionAction}>
            <input type="hidden" name="project_id" value={id} />
            <input type="hidden" name="id" value={i.id} />
            <button type="submit" className="text-xs text-red-700 hover:underline">
              Remove
            </button>
          </form>
        </div>
      )}

      {i.status === "failed" && !inspections.some((n) => n.reinspection_of === i.id) && (
        <form action={createInspectionAction} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="project_id" value={id} />
          <input type="hidden" name="title" value={`${i.title} — re-inspection`} />
          <input type="hidden" name="trade" value={i.trade ?? ""} />
          <input type="hidden" name="inspector" value={i.inspector ?? ""} />
          <input type="hidden" name="reinspection_of" value={i.id} />
          <div>
            <label className="app-label">Retest date</label>
            <input type="date" name="scheduled_date" className="mt-1" />
          </div>
          <button type="submit" className="app-btn app-btn-secondary">
            Schedule re-inspection
          </button>
        </form>
      )}
    </li>
  );

  return (
    <div className="max-w-3xl">
      <h2 className="app-h1 !text-[18px] mb-2">Inspections</h2>
      <p className="text-sm app-muted mb-8">
        The record a lender or the county asks for: what was inspected, when, by whom, and how it
        went. Failed inspections chain to their retest.
      </p>

      <form
        action={createInspectionAction}
        className="app-card grid gap-4 p-5 mb-10 md:grid-cols-4"
      >
        <input type="hidden" name="project_id" value={id} />
        <div className="md:col-span-2">
          <label className="app-label">Add an inspection</label>
          <input name="title" required placeholder="e.g. Framing inspection" className="mt-1 w-full" />
        </div>
        <div>
          <label className="app-label">Trade</label>
          <input name="trade" placeholder="Framing" className="mt-1 w-full" />
        </div>
        <div>
          <label className="app-label">Date</label>
          <input type="date" name="scheduled_date" className="mt-1 w-full" />
        </div>
        <div className="md:col-span-3">
          <label className="app-label">Inspector / jurisdiction</label>
          <input name="inspector" placeholder="City of Augusta" className="mt-1 w-full" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="app-btn app-btn-secondary">
            Add
          </button>
        </div>
      </form>

      {inspections.length === 0 && (
        <div className="app-card p-10 text-center text-sm italic app-muted">
          Nothing scheduled. The build playbook lists which inspections this jurisdiction expects —
          add them here as they get called in.
        </div>
      )}

      {open.length > 0 && (
        <section className="mb-10">
          <h3 className="app-h2 !text-[15px] mb-3">Coming up</h3>
          <ul className="space-y-3">{open.map(card)}</ul>
        </section>
      )}

      {resulted.length > 0 && (
        <section>
          <h3 className="app-h2 !text-[15px] mb-3">On the record</h3>
          <ul className="space-y-3">{resulted.map(card)}</ul>
        </section>
      )}
    </div>
  );
}
