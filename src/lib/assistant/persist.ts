import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canAccessConversation,
  conversationTitleFromUserContent,
  sanitizeModelMessages,
  stripConfirmationTokens,
  type AssistantConversationRecord,
  type AssistantDisplayItem,
  type AssistantSurface,
} from "@/lib/assistant/history";

type ConversationRow = {
  id: string;
  user_id: string;
  surface: AssistantSurface;
  project_id: string | null;
  title: string;
  model_messages: Anthropic.MessageParam[] | null;
  display_items: AssistantDisplayItem[] | null;
  last_message_at: string;
  deleted_at: string | null;
};

export type AssistantAuditDecision = "approved" | "declined" | "failed";

export async function ensureAssistantConversation(input: {
  userId: string;
  surface: AssistantSurface;
  conversationId?: string | null;
  projectId?: string | null;
  firstUserContent: unknown;
}): Promise<{
  id: string;
  title: string;
  created: boolean;
  displayItems: AssistantDisplayItem[];
}> {
  const admin = createAdminClient();
  if (input.conversationId) {
    const { data } = await admin
      .from("assistant_conversations")
      .select(
        "id, user_id, surface, project_id, title, model_messages, display_items, last_message_at, deleted_at"
      )
      .eq("id", input.conversationId)
      .maybeSingle();
    const row = data as ConversationRow | null;
    if (row && canAccessConversation(row, input.userId, input.surface, input.projectId)) {
      return {
        id: row.id,
        title: row.title,
        created: false,
        displayItems: Array.isArray(row.display_items) ? row.display_items : [],
      };
    }
  }

  const title = conversationTitleFromUserContent(input.firstUserContent);
  const { data, error } = await admin
    .from("assistant_conversations")
    .insert({
      user_id: input.userId,
      surface: input.surface,
      project_id: input.projectId ?? null,
      title,
    })
    .select("id, title")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not start the conversation.");
  }
  return { id: data.id, title: data.title, created: true, displayItems: [] };
}

export async function saveAssistantConversationTurn(input: {
  conversationId: string;
  userId: string;
  surface: AssistantSurface;
  messages: Anthropic.MessageParam[];
  displayItems: AssistantDisplayItem[];
  title?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("assistant_conversations")
    .update({
      model_messages: sanitizeModelMessages(input.messages),
      display_items: stripConfirmationTokens(input.displayItems),
      ...(input.title ? { title: input.title } : {}),
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", input.conversationId)
    .eq("user_id", input.userId)
    .eq("surface", input.surface)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
}

export async function writeAssistantAuditEvent(input: {
  conversationId: string;
  actorId: string;
  surface: AssistantSurface;
  projectId?: string | null;
  toolName: string;
  summary: string;
  decision: AssistantAuditDecision;
  resultExcerpt?: string | null;
  recordUrl?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("assistant_audit_events").insert({
    conversation_id: input.conversationId,
    actor_id: input.actorId,
    surface: input.surface,
    project_id: input.projectId ?? null,
    tool_name: input.toolName,
    summary: input.summary,
    decision: input.decision,
    result_excerpt: input.resultExcerpt ?? null,
    record_url: input.recordUrl ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function loadAssistantConversation(
  conversationId: string,
  userId: string,
  surface: AssistantSurface
): Promise<AssistantConversationRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assistant_conversations")
    .select(
      "id, user_id, surface, project_id, title, model_messages, display_items, last_message_at, deleted_at"
    )
    .eq("id", conversationId)
    .maybeSingle();
  const row = data as ConversationRow | null;
  if (!row || !canAccessConversation(row, userId, surface)) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    surface: row.surface,
    project_id: row.project_id,
    title: row.title,
    last_message_at: row.last_message_at,
    model_messages: Array.isArray(row.model_messages) ? row.model_messages : [],
    display_items: Array.isArray(row.display_items) ? row.display_items : [],
    deleted_at: row.deleted_at,
  };
}

export async function listAssistantConversations(input: {
  userId: string;
  surface: AssistantSurface;
  projectId?: string | null;
  limit?: number;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("assistant_conversations")
    .select("id, title, last_message_at, project_id")
    .eq("user_id", input.userId)
    .eq("surface", input.surface)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false })
    .limit(input.limit ?? 40);
  if (input.projectId) query = query.eq("project_id", input.projectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    id: string;
    title: string;
    last_message_at: string;
    project_id: string | null;
  }[];
}

export async function softDeleteAssistantConversation(
  conversationId: string,
  userId: string,
  surface: AssistantSurface
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("assistant_conversations")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .eq("surface", surface)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function safePersist(label: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    console.error(`[assistant-persist] ${label}`, error);
  }
}
