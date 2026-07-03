"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClientMessageComposer } from "@/components/project-hub/ClientMessageComposer";
import { MessageComposer } from "@/components/project-hub/MessageComposer";

export type ThreadMessage = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
  /** true when the message belongs on the viewer's side (right-aligned) */
  own_side: boolean;
};

type Props = {
  projectId: string;
  initialMessages: ThreadMessage[];
  /** Which composer + color scheme to use */
  viewer: "client" | "admin";
  /** Author ids known to be on the viewer's side (e.g. all admin ids for admin view) */
  ownAuthorIds: string[];
  emptyText: string;
};

/**
 * Chat thread that updates live via Supabase Realtime (postgres_changes on
 * project_messages, filtered to this project; RLS decides what each viewer
 * receives). Server-rendered history comes in as props; inserts stream in.
 */
export function LiveMessageThread({
  projectId,
  initialMessages,
  viewer,
  ownAuthorIds,
  emptyText,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ownIds = useRef(new Set(ownAuthorIds));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            author_id: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const ownSide = ownIds.current.has(row.author_id);
            return [
              ...prev,
              {
                id: row.id,
                body: row.body,
                created_at: row.created_at,
                author_id: row.author_id,
                author_name: ownSide
                  ? viewer === "client"
                    ? "You"
                    : "Team"
                  : viewer === "client"
                    ? "Project Team"
                    : "Client",
                own_side: ownSide,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, viewer]);

  const ownBubble = viewer === "client" ? "bg-copper text-bone" : "bg-navy text-bone";

  return (
    <div className="bg-paper border border-ink/15 p-6 md:p-8 min-h-[360px] flex flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 max-h-[460px] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.own_side ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 ${
                m.own_side ? ownBubble : "bg-bone border border-ink/10 text-ink"
              }`}
            >
              <div className="text-[9px] font-mono tracking-[0.15em] uppercase opacity-60 mb-1">
                {m.author_name} · {new Date(m.created_at).toLocaleString()}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          </div>
        ))}
        {!messages.length && (
          <p className="text-ink/50 italic text-sm text-center py-12">{emptyText}</p>
        )}
      </div>
      {viewer === "client" ? (
        <ClientMessageComposer projectId={projectId} />
      ) : (
        <MessageComposer projectId={projectId} />
      )}
    </div>
  );
}
