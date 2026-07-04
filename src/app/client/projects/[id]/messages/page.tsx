import { requireClientProjectFeature } from "@/lib/portal/access";
import Link from "next/link";
import {
  LiveMessageThread,
  type ThreadMessage,
} from "@/components/project-hub/LiveMessageThread";

export const dynamic = "force-dynamic";

export default async function ClientMessagesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, user, project } = await requireClientProjectFeature(id, "messages");

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
  const clientAuthorIds = [
    ...new Set([
      user.id,
      ...(profiles ?? []).filter((p) => p.role === "client").map((p) => p.id),
    ]),
  ];

  const thread: ThreadMessage[] = (messages ?? []).map((m) => {
    const p = byId.get(m.author_id);
    const isClient = p?.role === "client";
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      author_id: m.author_id,
      author_name:
        [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
        (isClient ? "You" : "Project Team"),
      own_side: Boolean(isClient),
    };
  });

  return (
    <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-2xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
      >
        ← {project.title}
      </Link>
      <h1 className="mt-6 font-display text-3xl text-ink">Messages</h1>
      <p className="mt-2 text-sm text-ink/60">
        Your project team is notified the moment you send.
      </p>

      <div className="mt-8">
        <LiveMessageThread
          projectId={id}
          initialMessages={thread}
          viewer="client"
          ownAuthorIds={clientAuthorIds}
          emptyText="Start a conversation with your project team."
        />
      </div>
    </div>
  );
}
