import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { anthropicConfigured } from "@/lib/ai/config";
import {
  listAssistantConversations,
  loadAssistantConversation,
} from "@/lib/assistant/persist";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Concierge — 8th Street Construction",
};

export default async function ClientAssistantPage(props: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { conversation: conversationId } = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("portal_active, first_name")
    .eq("id", user!.id)
    .single();

  const configured = anthropicConfigured() && Boolean(profile?.portal_active);
  const [conversations, initialConversation] = user
    ? await Promise.all([
        listAssistantConversations({ userId: user.id, surface: "client" }),
        conversationId
          ? loadAssistantConversation(conversationId, user.id, "client")
          : Promise.resolve(null),
      ])
    : [[], null];

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col px-6 md:px-10 lg:px-14 py-6 md:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <span className="eyebrow">— Concierge</span>
        <h1 className="mt-1 font-display text-2xl text-ink">
          Ask about your build{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
      </div>

      {configured ? (
        <div className="mx-auto mt-2 flex w-full min-h-0 max-w-5xl flex-1 flex-col">
          <AssistantChat
            config={{
              endpoint: "/api/client-assistant",
              surface: "client",
              conversations,
              ...(initialConversation
                ? {
                    initialConversation: {
                      id: initialConversation.id,
                      title: initialConversation.title,
                      model_messages: initialConversation.model_messages,
                      display_items: initialConversation.display_items,
                    },
                  }
                : {}),
              emptyTitle: "How can I help?",
              emptyBody:
                "Schedule, progress, volunteer days, documents, billing — ask anything about your project. If it needs the team, I'll draft a message and you approve it before it sends.",
              placeholder: 'Try: "are we on schedule?"',
              footnote: "Nothing is sent to the team without your approval.",
              suggestions: [
                "Are we on schedule?",
                "What happened on site recently?",
                "When is the next volunteer day, and what should crews bring?",
                "Where do we stand on payments?",
              ],
            }}
          />
        </div>
      ) : (
        <div className="mx-auto mt-8 w-full max-w-2xl border border-ink/15 bg-paper p-8 text-center">
          <p className="text-ink/60 italic">
            The concierge isn&apos;t available right now. Message your project team from the
            project page instead.
          </p>
        </div>
      )}
    </div>
  );
}
