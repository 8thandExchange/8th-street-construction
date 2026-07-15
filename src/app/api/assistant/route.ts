import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { BRAND_VOICE } from "@/lib/ai/config";
import {
  ASSISTANT_TOOLS,
  describeConfirmation,
  executeAssistantTool,
  requiresConfirmation,
} from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_LOOP_ITERATIONS = 12;

function assistantModel() {
  return process.env.ANTHROPIC_ASSISTANT_MODEL?.trim() || "claude-opus-4-8";
}

const SYSTEM_PROMPT = `You are the 8th Street Construction operations assistant, living inside the company's admin portal. The person talking to you is a verified admin (the builder). You take real actions on the business through your tools: invoicing (Mercury ACH rail), projects, clients, leads, build schedules, and client messaging.

${BRAND_VOICE}

Operating rules:
- Resolve names before acting. "Habitat" likely means the Habitat for Humanity project/client — use list_projects and get_project_billing to find the exact project and its billing state before touching money.
- Money actions (sending an invoice, marking one paid) and client messages are gated behind an in-app approval card — the admin must click Approve before they execute. So don't ask "are you sure?" in text; instead, state exactly what you're about to do and make the tool call. The approval UI is the confirmation.
- If a request is ambiguous in a way that changes the money outcome (wrong project match, unclear amount), ask one crisp clarifying question instead of guessing.
- Dollar amounts from the user like "12.5k" mean $12,500. Line item unit_amount is in dollars.
- When a money action completes, report the concrete result: invoice number, amount, who it went to, and that a Mercury ACH pay link was emailed (when applicable).
- Schedule questions ("where are we on Macon?", "are we behind?") → get_project_schedule and answer from its dates, days_late, and open tasks. Schedule changes ("push framing a week", "mark the slab done", "flag landscaping as a volunteer day") → update_milestone; the client portal reflects it immediately.
- Client messages (send_client_message) are written in the company voice, exactly as the client will read them — warm, plain-spoken, specific, signed "— The 8th Street team". Draft the full message text in the tool call; the approval card shows it to the admin before it sends. The client is notified by email, SMS, and push.
- Portal logins (create_portal_user): when the admin gives an explicit password, pass it through and no forced change applies; the tool test-signs-in and reports login_verified — relay that honestly. Never repeat a password the admin provided back in your text.
- File attachments: the admin can attach files in this chat; they arrive as "[Attached files: ...]" blocks with storage_path values. Pass them into create_invoice's attachments (with a clean display title like "Asbestos report.pdf") so they're emailed with the invoice and filed in the project's Documents tab. If the admin references an attachment but none is in the conversation, ask them to attach it with the paperclip.
- Keep responses short and operational. Lead with the outcome. No filler.
- Never invent invoice numbers, amounts, dates, or project facts — everything comes from tool results.`;

type ConfirmPayload = {
  tool_use_id: string;
  approved: boolean;
};

type RequestBody = {
  messages: Anthropic.MessageParam[];
  confirm?: ConfirmPayload;
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

async function runTool(name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  try {
    const result = await executeAssistantTool(name, input);
    return { content: JSON.stringify(result), isError: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return { content: JSON.stringify({ error: message }), isError: true };
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured. Add ANTHROPIC_API_KEY in Vercel." },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [...body.messages];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Resume path: the admin approved or declined a gated tool call.
        if (body.confirm) {
          const toolUse = findToolUse(messages, body.confirm.tool_use_id);
          if (!toolUse) {
            ndjson(controller, { type: "error", message: "Pending action not found." });
            ndjson(controller, { type: "done" });
            controller.close();
            return;
          }

          let result: { content: string; isError: boolean };
          if (body.confirm.approved) {
            ndjson(controller, { type: "tool_start", name: toolUse.name });
            result = await runTool(toolUse.name, toolUse.input);
            ndjson(controller, { type: "tool_end", name: toolUse.name, is_error: result.isError });
          } else {
            result = {
              content: JSON.stringify({
                declined: true,
                note: "The admin declined this action in the approval card. Do not retry it unless they ask again.",
              }),
              isError: false,
            };
          }

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

        // Agentic loop: stream text, execute read tools inline, pause on gated ones.
        for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration++) {
          const responseStream = client.messages.stream({
            model: assistantModel(),
            max_tokens: 16000,
            thinking: { type: "adaptive" },
            system: SYSTEM_PROMPT,
            tools: ASSISTANT_TOOLS,
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

          if (requiresConfirmation(toolUse.name, toolUse.input)) {
            ndjson(controller, {
              type: "confirm_required",
              tool_use_id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
              summary: describeConfirmation(toolUse.name, toolUse.input),
            });
            ndjson(controller, { type: "done" });
            controller.close();
            return;
          }

          ndjson(controller, { type: "tool_start", name: toolUse.name });
          const result = await runTool(toolUse.name, toolUse.input);
          ndjson(controller, { type: "tool_end", name: toolUse.name, is_error: result.isError });

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
