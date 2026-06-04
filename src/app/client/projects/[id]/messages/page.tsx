import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ClientMessageComposer } from "@/components/project-hub/ClientMessageComposer";

export const dynamic = "force-dynamic";

export default async function ClientMessagesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/client");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id")
    .eq("id", id)
    .single();

  if (!project || project.client_id !== user.id) notFound();

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
    <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-2xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
      >
        ← {project.title}
      </Link>
      <h1 className="mt-6 font-display text-3xl text-ink">Messages</h1>

      <div className="mt-8 bg-paper border border-ink/15 p-6 md:p-8 min-h-[360px] flex flex-col">
        <div className="flex-1 space-y-4 max-h-[420px] overflow-y-auto">
          {(messages ?? []).map((m) => {
            const p = byId.get(m.author_id);
            const isClient = p?.role === "client";
            const name =
              [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
              (isClient ? "You" : "Project Team");
            return (
              <div key={m.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 ${
                    isClient
                      ? "bg-copper text-bone"
                      : "bg-bone border border-ink/10 text-ink"
                  }`}
                >
                  <div className="text-[9px] font-mono tracking-[0.15em] uppercase opacity-60 mb-1">
                    {name} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })}
          {!messages?.length && (
            <p className="text-ink/50 italic text-sm text-center py-12">
              Start a conversation with your project team.
            </p>
          )}
        </div>
        <ClientMessageComposer projectId={id} />
      </div>
    </div>
  );
}
