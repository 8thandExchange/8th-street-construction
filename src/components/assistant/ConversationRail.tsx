"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatConversationTime,
  type AssistantConversationSummary,
} from "@/lib/assistant/history";

export function ConversationRail({
  conversations,
  currentId,
  onSelect,
  onCreate,
  onDelete,
  compact,
}: {
  conversations: AssistantConversationSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col", compact ? "w-full" : "w-56 shrink-0")}>
      <button
        type="button"
        onClick={onCreate}
        className="mb-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-medium text-navy transition-colors hover:border-copper/40"
      >
        <Plus size={14} strokeWidth={1.75} />
        New conversation
      </button>
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-navy/40">
        History
      </p>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {conversations.length === 0 ? (
          <p className="px-1 text-[12px] leading-relaxed app-muted">
            Conversations stay on this account until you delete them.
          </p>
        ) : (
          conversations.map((conversation) => {
            const active = conversation.id === currentId;
            return (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-start gap-2 rounded-lg px-2 py-2",
                  active ? "bg-navy/[0.06]" : "hover:bg-navy/[0.04]"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <MessageSquare
                      size={12}
                      strokeWidth={1.75}
                      className={cn("shrink-0", active ? "text-copper" : "text-navy/35")}
                    />
                    <span className="truncate text-[13px] text-navy">{conversation.title}</span>
                  </div>
                  <span className="mt-0.5 block pl-[18px] text-[11px] app-muted">
                    {formatConversationTime(conversation.last_message_at)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(conversation.id)}
                  className="mt-0.5 rounded p-1 text-navy/30 opacity-100 transition-colors hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
