import type Anthropic from "@anthropic-ai/sdk";

export type AssistantSurface = "admin" | "client";

export type AssistantDisplayItem =
  | { kind: "user"; text: string; files?: string[] }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; status: "running" | "done" | "error" }
  | { kind: "download"; url: string; fileName: string }
  | { kind: "action"; url: string; label: string; document?: boolean }
  | {
      kind: "confirm";
      confirmation: {
        tool_use_id: string;
        name: string;
        input: Record<string, unknown>;
        summary: string;
        token?: string;
      };
      resolved?: "approved" | "declined";
    }
  | { kind: "error"; text: string };

export type AssistantConversationSummary = {
  id: string;
  title: string;
  last_message_at: string;
  project_id: string | null;
};

export type AssistantConversationRecord = AssistantConversationSummary & {
  user_id: string;
  surface: AssistantSurface;
  project_id: string | null;
  model_messages: Anthropic.MessageParam[];
  display_items: AssistantDisplayItem[];
  deleted_at: string | null;
};

const TITLE_MAX = 64;
const TOOL_RESULT_MAX = 20_000;

export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((block) => {
      if (!block || typeof block !== "object") return [];
      const record = block as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") return [record.text];
      return [];
    })
    .join("\n")
    .trim();
}

export function extractAttachmentNames(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  const names: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    if (record.type === "attachment" && typeof record.file_name === "string") {
      names.push(record.file_name);
    }
  }
  return names;
}

export function conversationTitleFromUserContent(content: unknown): string {
  const text = extractTextContent(content).replace(/\s+/g, " ").trim();
  if (text) return truncateTitle(text);
  const files = extractAttachmentNames(content);
  if (files[0]) return truncateTitle(files[0]);
  return "New conversation";
}

export function userDisplayFromMessage(message: { content: unknown }): AssistantDisplayItem {
  const files = extractAttachmentNames(message.content);
  return {
    kind: "user",
    text: extractTextContent(message.content),
    ...(files.length ? { files } : {}),
  };
}

export function canAccessConversation(
  row: {
    user_id: string;
    surface: string;
    project_id: string | null;
    deleted_at: string | null;
  },
  userId: string,
  surface: AssistantSurface,
  projectId?: string | null
): boolean {
  if (row.deleted_at) return false;
  if (row.user_id !== userId) return false;
  if (row.surface !== surface) return false;
  if (projectId && row.project_id && row.project_id !== projectId) return false;
  return true;
}

export function stripConfirmationTokens(
  items: AssistantDisplayItem[]
): AssistantDisplayItem[] {
  return items.map((item) => {
    if (item.kind !== "confirm") return item;
    const confirmation = { ...item.confirmation };
    delete confirmation.token;
    return { ...item, confirmation };
  });
}

export function sanitizeModelMessages(
  messages: Anthropic.MessageParam[]
): Anthropic.MessageParam[] {
  return messages.map((message) => {
    if (!Array.isArray(message.content)) return message;
    const content = message.content.flatMap((block) => {
      if (!block || typeof block !== "object") return [];
      const record = block as unknown as Record<string, unknown>;
      if (record.type === "thinking") return [];
      if (record.type === "document" || record.type === "image") {
        return [{ type: "text" as const, text: `[${record.type} omitted]` }];
      }
      if (record.type === "tool_result") {
        return [
          {
            ...record,
            content: truncateToolResult(record.content),
          } as Anthropic.ToolResultBlockParam,
        ];
      }
      return [block];
    });
    return { ...message, content: content as Anthropic.MessageParam["content"] };
  });
}

export function recordUrlFromToolResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const record = result as Record<string, unknown>;
  for (const key of ["admin_page", "billing_page", "documents_page", "packet_pdf", "pdf"]) {
    const value = record[key];
    if (typeof value === "string" && value.startsWith("/")) return value;
  }
  return null;
}

export function resultExcerptFromToolResult(result: unknown, isError = false): string {
  if (typeof result === "string") return truncateExcerpt(result);
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    if (typeof record.error === "string") return truncateExcerpt(record.error);
    if (record.declined === true) return "Declined";
    const bits = [record.invoice_number, record.number, record.title, record.status]
      .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
      .map(String);
    if (bits.length) return truncateExcerpt(bits.join(" · "));
    try {
      return truncateExcerpt(JSON.stringify(result));
    } catch {
      return isError ? "Action failed" : "Completed";
    }
  }
  return isError ? "Action failed" : "Completed";
}

export function applyAssistantStreamEvent(
  items: AssistantDisplayItem[],
  event: Record<string, unknown>
): AssistantDisplayItem[] {
  switch (event.type) {
    case "text": {
      const text = String(event.text ?? "");
      const next = [...items];
      const last = next[next.length - 1];
      if (last?.kind === "assistant") {
        next[next.length - 1] = { kind: "assistant", text: last.text + text };
      } else {
        next.push({ kind: "assistant", text });
      }
      return next;
    }
    case "tool_start":
      return [...items, { kind: "tool", name: String(event.name ?? ""), status: "running" }];
    case "tool_end": {
      const name = String(event.name ?? "");
      const isError = Boolean(event.is_error);
      const download = event.download as { url?: string; file_name?: string } | undefined;
      const actions = event.actions as
        | { url?: string; label?: string; kind?: "page" | "document" }[]
        | undefined;
      const next = [...items];
      for (let idx = next.length - 1; idx >= 0; idx--) {
        const item = next[idx];
        if (item.kind === "tool" && item.name === name && item.status === "running") {
          next[idx] = { kind: "tool", name, status: isError ? "error" : "done" };
          break;
        }
      }
      if (!isError && download?.url) {
        next.push({
          kind: "download",
          url: download.url,
          fileName: download.file_name ?? "download.pdf",
        });
      }
      if (!isError) {
        for (const action of actions ?? []) {
          if (!action.url || !action.label) continue;
          next.push({
            kind: "action",
            url: action.url,
            label: action.label,
            document: action.kind === "document",
          });
        }
      }
      return next;
    }
    case "confirm_required":
      return [
        ...items,
        {
          kind: "confirm",
          confirmation: {
            tool_use_id: String(event.tool_use_id ?? ""),
            name: String(event.name ?? ""),
            input: (event.input ?? {}) as Record<string, unknown>,
            summary: String(event.summary ?? ""),
            token: event.token ? String(event.token) : undefined,
          },
        },
      ];
    case "confirm_resolved":
      return items.map((item) =>
        item.kind === "confirm" &&
        item.confirmation.tool_use_id === String(event.tool_use_id ?? "")
          ? { ...item, resolved: event.approved ? "approved" : "declined" }
          : item
      );
    case "error":
      return [...items, { kind: "error", text: String(event.message ?? "") }];
    default:
      return items;
  }
}

export function formatConversationTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const delta = Math.max(0, now - then);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncateTitle(value: string): string {
  return value.length > TITLE_MAX ? `${value.slice(0, TITLE_MAX - 1)}…` : value;
}

function truncateExcerpt(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 280 ? `${compact.slice(0, 277)}…` : compact;
}

function truncateToolResult(content: unknown): unknown {
  if (typeof content !== "string") return content;
  return content.length > TOOL_RESULT_MAX
    ? `${content.slice(0, TOOL_RESULT_MAX)}…[truncated]`
    : content;
}
