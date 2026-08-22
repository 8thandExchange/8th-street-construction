"use server";

import { createClient } from "@/lib/supabase/server";
import {
  loadAssistantConversation,
  listAssistantConversations,
  softDeleteAssistantConversation,
} from "@/lib/assistant/persist";
import type { AssistantConversationRecord, AssistantSurface } from "@/lib/assistant/history";

async function requireSurfaceUser(surface: AssistantSurface) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Unauthorized");
  if (surface === "admin" && profile.role !== "admin") throw new Error("Unauthorized");
  if (surface === "client" && profile.role !== "client") throw new Error("Unauthorized");
  return { user, profile };
}

export async function listMyAssistantConversations(
  surface: AssistantSurface,
  projectId?: string | null
) {
  const { user } = await requireSurfaceUser(surface);
  return listAssistantConversations({
    userId: user.id,
    surface,
    projectId,
  });
}

export async function getMyAssistantConversation(
  conversationId: string,
  surface: AssistantSurface
): Promise<AssistantConversationRecord | null> {
  const { user } = await requireSurfaceUser(surface);
  return loadAssistantConversation(conversationId, user.id, surface);
}

export async function deleteMyAssistantConversation(
  conversationId: string,
  surface: AssistantSurface
): Promise<{ ok: true } | { error: string }> {
  const { user } = await requireSurfaceUser(surface);
  const deleted = await softDeleteAssistantConversation(conversationId, user.id, surface);
  if (!deleted) return { error: "Conversation not found." };
  return { ok: true };
}
