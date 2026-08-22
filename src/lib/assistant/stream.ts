import Anthropic from "@anthropic-ai/sdk";
import {
  signAssistantAction,
  verifyAssistantAction,
} from "@/lib/assistant/confirmation-token";

/**
 * Shared agentic streaming loop for the assistant surfaces (admin ops
 * assistant and client concierge). Streams NDJSON events: text deltas,
 * tool start/end, history snapshots, confirm_required pauses for gated
 * tools, and errors. The caller owns auth, the system prompt, and the
 * tool surface.
 */

const MAX_LOOP_ITERATIONS = 12;

export type ConfirmPayload = {
  tool_use_id: string;
  approved: boolean;
  token: string;
};

export type AssistantStreamConfig = {
  apiKey: string;
  model: string;
  system: string;
  tools: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
  confirm?: ConfirmPayload;
  executeTool: (name: string, input: unknown) => Promise<unknown>;
  requiresConfirmation: (name: string, input: unknown) => boolean;
  /** May be async so the summary can quote the real stored record (e.g. a draft invoice). */
  describeConfirmation: (name: string, input: unknown) => string | Promise<string>;
  /** Sent back to the model when the human declines a gated action. */
  declinedNote: string;
  /** Server-only HMAC secret that binds approval to the exact reviewed action. */
  confirmationSecret: string;
};

export type AssistantActionLink = {
  url: string;
  label: string;
  kind: "page" | "document";
};

function ndjson(controller: ReadableStreamDefaultController, obj: unknown) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));
}

function findToolUse(
  messages: Anthropic.MessageParam[],
  toolUseId: string
): Anthropic.ToolUseBlock | null {
  for (let m = messages.length - 1; m >= 0; m--) {
    const content = messages[m].content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === "tool_use" && block.id === toolUseId) {
        return block as Anthropic.ToolUseBlock;
      }
    }
  }
  return null;
}

export function assistantStreamResponse(config: AssistantStreamConfig): Response {
  const client = new Anthropic({ apiKey: config.apiKey });
  const messages: Anthropic.MessageParam[] = [...config.messages];

  async function runTool(
    name: string,
    input: unknown
  ): Promise<{
    content: string;
    isError: boolean;
    download?: { url: string; file_name: string };
    actions?: AssistantActionLink[];
  }> {
    try {
      const result = await config.executeTool(name, input);
      // Tools that produce a downloadable file surface a card in the chat UI.
      let download: { url: string; file_name: string } | undefined;
      if (
        result &&
        typeof result === "object" &&
        typeof (result as Record<string, unknown>).download_url === "string"
      ) {
        const r = result as Record<string, unknown>;
        download = {
          url: String(r.download_url),
          file_name: String(r.file_name ?? "download.pdf"),
        };
      }
      const actions = extractAssistantActionLinks(result);
      return { content: JSON.stringify(result), isError: false, download, actions };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool execution failed";
      return { content: JSON.stringify({ error: message }), isError: true };
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Resume path: the human approved or declined a gated tool call.
        if (config.confirm) {
          let signedAction;
          try {
            signedAction = verifyAssistantAction(
              config.confirm.token,
              config.confirmationSecret
            );
          } catch (error) {
            ndjson(controller, {
              type: "error",
              message: error instanceof Error ? error.message : "Approval could not be verified.",
            });
            ndjson(controller, { type: "done" });
            controller.close();
            return;
          }
          if (signedAction.toolUseId !== config.confirm.tool_use_id) {
            ndjson(controller, { type: "error", message: "Approval does not match this action." });
            ndjson(controller, { type: "done" });
            controller.close();
            return;
          }
          const toolUse = findToolUse(messages, signedAction.toolUseId);
          if (!toolUse) {
            ndjson(controller, { type: "error", message: "Pending action not found." });
            ndjson(controller, { type: "done" });
            controller.close();
            return;
          }

          let result: {
            content: string;
            isError: boolean;
            download?: { url: string; file_name: string };
            actions?: AssistantActionLink[];
          };
          if (config.confirm.approved) {
            ndjson(controller, { type: "tool_start", name: signedAction.name });
            result = await runTool(signedAction.name, signedAction.input);
            ndjson(controller, {
              type: "tool_end",
              name: signedAction.name,
              is_error: result.isError,
              ...(result.download ? { download: result.download } : {}),
              ...(result.actions?.length ? { actions: result.actions } : {}),
            });
          } else {
            result = {
              content: JSON.stringify({ declined: true, note: config.declinedNote }),
              isError: false,
            };
          }

          const toolResultMessage: Anthropic.MessageParam = {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: signedAction.toolUseId,
                content: result.content,
                is_error: result.isError || undefined,
              },
            ],
          };
          messages.push(toolResultMessage);
          ndjson(controller, { type: "history", message: toolResultMessage });
        }

        // Agentic loop: stream text, execute read tools inline, pause on gated ones.
        for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration++) {
          const responseStream = client.messages.stream({
            model: config.model,
            max_tokens: 16000,
            thinking: { type: "adaptive" },
            system: config.system,
            tools: config.tools,
            tool_choice: { type: "auto", disable_parallel_tool_use: true },
            messages,
          });

          responseStream.on("text", (delta) => {
            ndjson(controller, { type: "text", text: delta });
          });
          responseStream.on("contentBlock", (block) => {
            if (block.type === "thinking") {
              ndjson(controller, { type: "thinking" });
            }
          });

          const response = await responseStream.finalMessage();

          const assistantMessage: Anthropic.MessageParam = {
            role: "assistant",
            content: response.content,
          };
          messages.push(assistantMessage);
          ndjson(controller, { type: "history", message: assistantMessage });

          const toolUse = response.content.find(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          if (response.stop_reason !== "tool_use" || !toolUse) {
            ndjson(controller, { type: "done" });
            controller.close();
            return;
          }

          if (config.requiresConfirmation(toolUse.name, toolUse.input)) {
            const token = signAssistantAction(
              {
                toolUseId: toolUse.id,
                name: toolUse.name,
                input: toolUse.input,
              },
              config.confirmationSecret
            );
            ndjson(controller, {
              type: "confirm_required",
              tool_use_id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
              summary: await config.describeConfirmation(toolUse.name, toolUse.input),
              token,
            });
            ndjson(controller, { type: "done" });
            controller.close();
            return;
          }

          ndjson(controller, { type: "tool_start", name: toolUse.name });
          const result = await runTool(toolUse.name, toolUse.input);
          ndjson(controller, {
            type: "tool_end",
            name: toolUse.name,
            is_error: result.isError,
            ...(result.download ? { download: result.download } : {}),
            ...(result.actions?.length ? { actions: result.actions } : {}),
          });

          const toolResultMessage: Anthropic.MessageParam = {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result.content,
                is_error: result.isError || undefined,
              },
            ],
          };
          messages.push(toolResultMessage);
          ndjson(controller, { type: "history", message: toolResultMessage });
        }

        ndjson(controller, {
          type: "error",
          message: "Stopped after too many steps. Ask me to continue if the task isn't finished.",
        });
        ndjson(controller, { type: "done" });
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `Claude API error (${err.status}): ${err.message}`
            : err instanceof Error
              ? err.message
              : "Assistant failed";
        try {
          ndjson(controller, { type: "error", message });
          ndjson(controller, { type: "done" });
          controller.close();
        } catch {
          // stream already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export function extractAssistantActionLinks(result: unknown): AssistantActionLink[] {
  if (!result || typeof result !== "object") return [];
  const record = result as Record<string, unknown>;
  const candidates: Array<[string, string, "page" | "document"]> = [
    ["admin_page", "Open record", "page"],
    ["billing_page", "Open billing", "page"],
    ["documents_page", "Open documents", "page"],
    ["packet_pdf", "Open invoice packet", "document"],
    ["pdf", "Open PDF", "document"],
  ];
  const seen = new Set<string>();
  return candidates.flatMap(([key, label, kind]) => {
    const value = record[key];
    if (typeof value !== "string" || !value.startsWith("/") || seen.has(value)) return [];
    seen.add(value);
    return [{ url: value, label, kind }];
  });
}
