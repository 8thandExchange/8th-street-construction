import type Anthropic from "@anthropic-ai/sdk";
import {
  userDisplayFromMessage,
  type AssistantDisplayItem,
  type AssistantSurface,
} from "@/lib/assistant/history";
import {
  ensureAssistantConversation,
  saveAssistantConversationTurn,
  safePersist,
  writeAssistantAuditEvent,
} from "@/lib/assistant/persist";

export async function prepareAssistantPersistence(input: {
  userId: string;
  surface: AssistantSurface;
  projectId?: string | null;
  conversationId?: string | null;
  incomingMessages: Anthropic.MessageParam[];
  confirm?: { tool_use_id: string; approved: boolean };
}) {
  const firstUser = input.incomingMessages.find((message) => message.role === "user");
  const conversation = await ensureAssistantConversation({
    userId: input.userId,
    surface: input.surface,
    conversationId: input.conversationId,
    projectId: input.projectId,
    firstUserContent: firstUser?.content ?? "",
  });

  const last = input.incomingMessages[input.incomingMessages.length - 1];
  const isNewUserTurn = last?.role === "user" && !input.confirm && !hasToolResult(last);
  const initialDisplayItems: AssistantDisplayItem[] = [
    ...conversation.displayItems,
    ...(isNewUserTurn ? [userDisplayFromMessage(last)] : []),
  ];

  return {
    conversation: { id: conversation.id, title: conversation.title },
    persistableMessages: input.incomingMessages,
    initialDisplayItems,
    persistSnapshot: (snapshot: {
      messages: Anthropic.MessageParam[];
      displayItems: AssistantDisplayItem[];
    }) =>
      safePersist("snapshot", () =>
        saveAssistantConversationTurn({
          conversationId: conversation.id,
          userId: input.userId,
          surface: input.surface,
          messages: snapshot.messages,
          displayItems: snapshot.displayItems,
          title: conversation.created ? conversation.title : undefined,
        })
      ),
    persistAudit: (event: {
      toolName: string;
      summary: string;
      decision: "approved" | "declined" | "failed";
      resultExcerpt: string | null;
      recordUrl: string | null;
    }) =>
      safePersist("audit", () =>
        writeAssistantAuditEvent({
          conversationId: conversation.id,
          actorId: input.userId,
          surface: input.surface,
          projectId: input.projectId,
          toolName: event.toolName,
          summary: event.summary,
          decision: event.decision,
          resultExcerpt: event.resultExcerpt,
          recordUrl: event.recordUrl,
        })
      ),
  };
}

function hasToolResult(message: Anthropic.MessageParam): boolean {
  return (
    Array.isArray(message.content) &&
    message.content.some(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: string }).type === "tool_result"
    )
  );
}
