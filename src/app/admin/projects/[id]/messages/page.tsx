import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  LiveMessageThread,
  type ThreadMessage,
} from "@/components/project-hub/LiveMessageThread";

export const dynamic = "force-dynamic";

export default async function ProjectMessagesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const adminAuthorIds = [
    ...new Set([
      ...(user ? [user.id] : []),
      ...(profiles ?? []).filter((p) => p.role === "admin").map((p) => p.id),
    ]),
  ];

  const thread: ThreadMessage[] = (messages ?? []).map((m) => {
    const p = byId.get(m.author_id);
    const isAdmin = p?.role === "admin";
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      author_id: m.author_id,
      author_name:
        [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
        (isAdmin ? "Team" : "Client"),
      own_side: Boolean(isAdmin),
    };
  });

  return (
    <div className="max-w-2xl">
      <h2 className="app-h1 !text-[18px] mb-2">Messages</h2>
      <p className="text-sm text-ink/60 mb-8">
        Thread with your client on {project.title}. Client replies appear live and also hit
        your email.
      </p>

      <LiveMessageThread
        projectId={id}
        initialMessages={thread}
        viewer="admin"
        ownAuthorIds={adminAuthorIds}
        emptyText="No messages yet. Start the conversation below."
      />
    </div>
  );
}
