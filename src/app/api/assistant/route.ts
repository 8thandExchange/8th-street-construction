import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { BRAND_VOICE } from "@/lib/ai/config";
import { assistantStreamResponse, type ConfirmPayload } from "@/lib/assistant/stream";
import {
  ASSISTANT_TOOLS,
  describeConfirmation,
  executeAssistantTool,
  requiresConfirmation,
} from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
- Keep responses short and operational. Lead with the outcome. No filler.
- Never invent invoice numbers, amounts, dates, or project facts — everything comes from tool results.`;

type RequestBody = {
  messages: Anthropic.MessageParam[];
  confirm?: ConfirmPayload;
};

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

  return assistantStreamResponse({
    apiKey,
    model: assistantModel(),
    system: SYSTEM_PROMPT,
    tools: ASSISTANT_TOOLS,
    messages: body.messages,
    confirm: body.confirm,
    executeTool: executeAssistantTool,
    requiresConfirmation,
    describeConfirmation,
    declinedNote:
      "The admin declined this action in the approval card. Do not retry it unless they ask again.",
  });
}
