import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BuildingRegulationsPanel } from "@/components/project-hub/BuildingRegulationsPanel";
import { PlanSignOffForm } from "@/components/project-hub/PlanSignOffForm";
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

export default async function ClientPlansPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/client");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id, jurisdiction, location")
    .eq("id", id)
    .single();

  if (!project || project.client_id !== user.id) notFound();

  const regulations = resolveJurisdiction(project.jurisdiction, project.location);

  const { data: planSets } = await supabase
    .from("project_plan_sets")
    .select(
      "id, version, title, description, status, sent_to_client_at, client_signed_at, client_signature_text, client_acknowledgment, revision_notes, regulations_snapshot"
    )
    .eq("project_id", id)
    .neq("status", "draft")
    .order("version", { ascending: false });

  const planSetIds = (planSets ?? []).map((p) => p.id);
  const { data: allFiles } = planSetIds.length
    ? await supabase
        .from("project_plan_files")
        .select("id, plan_set_id, title, kind, file_size_bytes")
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
    <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-ink">Plans & Renderings</h1>
      <p className="mt-3 text-ink/65 text-sm leading-relaxed">
        Review architectural plans and renderings for your project. Sign off when you approve, or
        request revisions — we keep a permanent record of your decision.
      </p>

      <div className="mt-10">
        <BuildingRegulationsPanel regulations={regulations} compact />
      </div>

      <ul className="mt-10 space-y-8">
        {(planSets ?? []).map((ps) => {
          const snapshot = ps.regulations_snapshot as JurisdictionRegulations | null;
          const files = filesBySet[ps.id] ?? [];
          return (
            <li key={ps.id} className="bg-paper border border-ink/15 p-8">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-mono text-xs text-stone-300">v{ps.version}</span>
                <h2 className="font-display text-xl text-ink">{ps.title}</h2>
                <span
                  className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${PLAN_SET_STATUS_STYLES[ps.status]}`}
                >
                  {PLAN_SET_STATUS_LABELS[ps.status]}
                </span>
              </div>
              {ps.description && (
                <p className="text-sm text-ink/80 whitespace-pre-wrap leading-relaxed">
                  {ps.description}
                </p>
              )}

              <ul className="mt-5 space-y-3">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-sm text-ink">{f.title}</span>
                      <span className="block text-[10px] font-mono uppercase text-stone-300 mt-0.5">
                        {kindLabel(f.kind)}
                      </span>
                    </div>
                    <Link
                      href={`/api/plan-files/${f.id}/download`}
                      className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline shrink-0"
                    >
                      View / Download
                    </Link>
                  </li>
                ))}
              </ul>

              {snapshot && ps.status === "pending_client" && (
                <p className="mt-4 text-xs text-ink/55">
                  This package was prepared under {snapshot.name} building requirements. Review the
                  local regulations above before signing off.
                </p>
              )}

              {ps.status === "pending_client" && (
                <PlanSignOffForm planSetId={ps.id} projectId={id} />
              )}

              {ps.status === "approved" && (
                <div className="mt-6 p-4 border border-emerald-200 bg-emerald-50/50 text-sm">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-800 mb-1">
                    You signed off
                  </div>
                  <div>
                    {ps.client_signature_text}
                    {ps.client_signed_at &&
                      ` · ${new Date(ps.client_signed_at).toLocaleDateString()}`}
                  </div>
                </div>
              )}

              {ps.status === "revision_requested" && (
                <div className="mt-6 p-4 border border-amber-200 bg-amber-50/50 text-sm">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-amber-800 mb-1">
                    Revision requested
                  </div>
                  <p className="text-ink/80 whitespace-pre-wrap">{ps.revision_notes}</p>
                  <p className="mt-2 text-xs text-ink/55">
                    Your builder will upload a revised plan set for your review.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!planSets?.length && (
        <p className="mt-12 text-ink/50 italic text-center py-12 border border-dashed border-ink/20">
          No plans or renderings are ready for your review yet.
        </p>
      )}
    </div>
  );
}
