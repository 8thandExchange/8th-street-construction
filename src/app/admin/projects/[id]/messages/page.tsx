import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MessageComposer } from "@/components/project-hub/MessageComposer";

export const dynamic = "force-dynamic";

export default async function ProjectMessagesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const { data: messages } = await supabase
    .from("project_messages")
    .select("id, body, created_at, author_id")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  const authorIds = [...new Set((messages ?? []).map((m) => m.author_id))];
  const { data: profiles } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, role")
        .in("id", authorIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="max-w-2xl">
      <h2 className="app-h1 !text-[18px] mb-2">Messages</h2>
      <p className="text-sm text-ink/60 mb-8">
        Thread with your client on {project.title}.
      </p>

      <div className="bg-paper border border-ink/15 p-6 md:p-8 min-h-[320px] flex flex-col">
        <div className="flex-1 space-y-4 max-h-[480px] overflow-y-auto">
          {(messages ?? []).map((m) => {
            const p = byId.get(m.author_id);
            const isAdmin = p?.role === "admin";
            const name =
              [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
              (isAdmin ? "Team" : "Client");
            return (
              <div
                key={m.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 ${
                    isAdmin
                      ? "bg-navy text-bone"
                      : "bg-bone border border-ink/10 text-ink"
                  }`}
                >
                  <div className="text-[9px] font-mono tracking-[0.15em] uppercase opacity-60 mb-1">
                    {name} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
              </div>
            );
          })}
          {!messages?.length && (
            <p className="text-ink/50 italic text-sm text-center py-12">
              No messages yet. Start the conversation below.
            </p>
          )}
        </div>
        <MessageComposer projectId={id} />
      </div>
    </div>
  );
}
