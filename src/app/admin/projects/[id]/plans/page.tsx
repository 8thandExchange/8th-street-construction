import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NewPlanSetForm } from "@/components/project-hub/NewPlanSetForm";
import { BuildingRegulationsPanel } from "@/components/project-hub/BuildingRegulationsPanel";
import { deletePlanSet, sendPlanSetToClient } from "@/lib/actions/plan-sets";
import { resolveJurisdiction } from "@/lib/building-regulations/registry";
import {
  PLAN_FILE_KINDS,
  PLAN_SET_STATUS_LABELS,
  PLAN_SET_STATUS_STYLES,
} from "@/lib/project/labels";
import type { JurisdictionRegulations } from "@/lib/building-regulations/types";

export const dynamic = "force-dynamic";

function kindLabel(value: string) {
  return PLAN_FILE_KINDS.find((k) => k.value === value)?.label ?? value;
}

export default async function ProjectPlansPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, jurisdiction, location")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const regulations = resolveJurisdiction(project.jurisdiction, project.location);

  const { data: planSets } = await supabase
    .from("project_plan_sets")
    .select(
      "id, version, title, description, status, sent_to_client_at, client_signed_at, client_signature_text, client_acknowledgment, revision_notes, regulations_snapshot, created_at"
    )
    .eq("project_id", id)
    .order("version", { ascending: false });

  const planSetIds = (planSets ?? []).map((p) => p.id);
  const { data: allFiles } = planSetIds.length
    ? await supabase
        .from("project_plan_files")
        .select("id, plan_set_id, title, kind, file_size_bytes, display_order")
        .in("plan_set_id", planSetIds)
        .order("display_order")
    : { data: [] };

  const filesBySet = (allFiles ?? []).reduce<Record<string, typeof allFiles>>((acc, f) => {
    const list = acc[f.plan_set_id] ?? [];
    list.push(f);
    acc[f.plan_set_id] = list;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h2 className="app-h1 !text-[18px]">Plans & Renderings</h2>
          <p className="text-sm text-ink/60 mt-2">
            Versioned plan packages with client sign-off records and local AHJ requirements.
          </p>
        </div>
        <NewPlanSetForm projectId={id} />
      </div>

      <BuildingRegulationsPanel regulations={regulations} />

      <div className="mt-10 space-y-6">
        {(planSets ?? []).map((ps) => {
          const snapshot = ps.regulations_snapshot as JurisdictionRegulations | null;
          const files = filesBySet[ps.id] ?? [];
          return (
            <article key={ps.id} className="bg-paper border border-ink/15 p-8">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-mono text-xs text-stone-300">v{ps.version}</span>
                <h3 className="app-h2 !text-[16px]">{ps.title}</h3>
                <span
                  className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${PLAN_SET_STATUS_STYLES[ps.status]}`}
                >
                  {PLAN_SET_STATUS_LABELS[ps.status]}
                </span>
              </div>
              {ps.description && (
                <p className="text-sm text-ink/75 whitespace-pre-wrap">{ps.description}</p>
              )}

              <ul className="mt-5 space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="text-ink">{f.title}</span>
                      <span className="text-xs font-mono text-stone-300 ml-2 uppercase">
                        {kindLabel(f.kind)}
                      </span>
                    </div>
                    <Link
                      href={`/api/plan-files/${f.id}/download`}
                      className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline"
                    >
                      Download
                    </Link>
                  </li>
                ))}
              </ul>

              {ps.status === "approved" && (
                <div className="mt-6 p-4 border border-emerald-200 bg-emerald-50/50 text-sm">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-800 mb-2">
                    Client Sign-Off Record
                  </div>
                  <div>
                    Signed by <strong>{ps.client_signature_text}</strong>
                    {ps.client_signed_at &&
                      ` on ${new Date(ps.client_signed_at).toLocaleString()}`}
                  </div>
                  {ps.client_acknowledgment && (
                    <p className="mt-2 text-ink/70 italic">&ldquo;{ps.client_acknowledgment}&rdquo;</p>
                  )}
                </div>
              )}

              {ps.status === "revision_requested" && ps.revision_notes && (
                <div className="mt-6 p-4 border border-amber-200 bg-amber-50/50 text-sm">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-amber-800 mb-2">
                    Client Revision Request
                  </div>
                  <p className="text-ink/80 whitespace-pre-wrap">{ps.revision_notes}</p>
                </div>
              )}

              {snapshot && (
                <p className="mt-4 text-xs font-mono text-stone-300">
                  Regulations snapshot: {snapshot.name} ({snapshot.state})
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-4">
                {(ps.status === "draft" || ps.status === "revision_requested") && (
                  <form
                    action={async (fd) => {
                      await sendPlanSetToClient(fd);
                    }}
                  >
                    <input type="hidden" name="id" value={ps.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <button
                      type="submit"
                      className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline"
                    >
                      {ps.status === "revision_requested" ? "Resend for sign-off" : "Send to client"}
                    </button>
                  </form>
                )}
                <form
                  action={async (fd) => {
                    await deletePlanSet(fd);
                  }}
                >
                  <input type="hidden" name="id" value={ps.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <button
                    type="submit"
                    className="font-mono text-[10px] tracking-[0.15em] uppercase text-stone-300 hover:text-red-600"
                  >
                    Delete set
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>

      {!planSets?.length && (
        <p className="text-ink/50 italic py-12 text-center border border-dashed border-ink/20 mt-10">
          No plan sets yet. Upload drawings and renderings to start the sign-off workflow.
        </p>
      )}
    </div>
  );
}
