import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/actions/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assistant approvals — 8th Street Construction",
};

const DECISION_LABELS: Record<string, string> = {
  approved: "Approved",
  declined: "Declined",
  failed: "Failed",
};

export default async function AssistantAuditPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("assistant_audit_events")
    .select(
      "id, created_at, surface, tool_name, summary, decision, result_excerpt, record_url, conversation_id, actor_id, project_id"
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const rows = (data ?? []) as AuditRow[];
  const actorIds = [...new Set(rows.map((row) => row.actor_id))];
  const projectIds = [...new Set(rows.map((row) => row.project_id).filter(Boolean))] as string[];
  const conversationIds = [
    ...new Set(rows.map((row) => row.conversation_id).filter(Boolean)),
  ] as string[];

  const [{ data: actors }, { data: projects }, { data: conversations }] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, email").in("id", actorIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase.from("projects").select("id, title").in("id", projectIds)
      : Promise.resolve({ data: [] }),
    conversationIds.length
      ? supabase.from("assistant_conversations").select("id, title").in("id", conversationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const actorById = new Map(
    ((actors ?? []) as { id: string; first_name: string | null; last_name: string | null; email: string }[]).map(
      (actor) => [actor.id, actor]
    )
  );
  const projectById = new Map(
    ((projects ?? []) as { id: string; title: string }[]).map((project) => [project.id, project])
  );
  const conversationById = new Map(
    ((conversations ?? []) as { id: string; title: string }[]).map((conversation) => [
      conversation.id,
      conversation,
    ])
  );

  const events = rows.map((row) => ({
    ...row,
    actor: actorById.get(row.actor_id) ?? null,
    project: row.project_id ? projectById.get(row.project_id) ?? null : null,
    conversation: row.conversation_id ? conversationById.get(row.conversation_id) ?? null : null,
  }));

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <div className="mb-8 max-w-3xl">
        <span className="app-label !text-copper">AI operations partner</span>
        <h1 className="mt-1 app-h1 !text-[24px]">Approval history</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed app-muted">
          Every assistant action that moved money, reached a client, or changed a live record. Chat
          transcripts stay with the person who had them; this log is the company record.
        </p>
        <Link href="/supabase/assistant" className="mt-4 inline-block text-[13px] font-medium text-copper">
          ← Back to assistant
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="max-w-2xl rounded-xl border border-navy/10 bg-white p-6 text-sm app-muted">
          No approvals yet. When someone approves or declines an assistant action, it appears here
          with the actor, the reviewed summary, and a link to the record.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-navy/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-navy/10 text-[11px] font-medium uppercase tracking-[0.08em] text-navy/45">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Record</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                return (
                  <tr key={event.id} className="border-b border-navy/5 align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-navy/60">
                      {new Date(event.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-navy">
                        {[event.actor?.first_name, event.actor?.last_name].filter(Boolean).join(" ") ||
                          event.actor?.email ||
                          "Unknown"}
                      </div>
                      <div className="text-[11px] app-muted">
                        {event.surface === "client" ? "Client concierge" : "Admin assistant"}
                        {event.project?.title ? ` · ${event.project.title}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          event.decision === "approved"
                            ? "text-copper"
                            : event.decision === "failed"
                              ? "text-red-600"
                              : "text-navy/55"
                        }
                      >
                        {DECISION_LABELS[event.decision] ?? event.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{event.summary}</div>
                      <div className="mt-0.5 text-[11px] app-muted">
                        {event.tool_name}
                        {event.result_excerpt ? ` · ${event.result_excerpt}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {event.record_url ? (
                        <Link href={event.record_url} className="text-copper hover:underline">
                          Open record
                        </Link>
                      ) : event.conversation?.title ? (
                        <span className="app-muted">{event.conversation.title}</span>
                      ) : (
                        <span className="app-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type AuditRow = {
  id: string;
  created_at: string;
  surface: string;
  tool_name: string;
  summary: string;
  decision: string;
  result_excerpt: string | null;
  record_url: string | null;
  conversation_id: string | null;
  actor_id: string;
  project_id: string | null;
};
