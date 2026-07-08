import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientVisibleProjects } from "@/lib/portal/access";
import { BRAND_VOICE } from "@/lib/ai/config";
import { assistantStreamResponse, type ConfirmPayload } from "@/lib/assistant/stream";
import {
  CLIENT_ASSISTANT_TOOLS,
  clientRequiresConfirmation,
  describeClientConfirmation,
  executeClientAssistantTool,
  type ClientAssistantContext,
} from "@/lib/assistant/client-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function assistantModel() {
  return process.env.ANTHROPIC_ASSISTANT_MODEL?.trim() || "claude-opus-4-8";
}

function systemPrompt(ctx: ClientAssistantContext) {
  const projectContext = ctx.projects.length
    ? ctx.projects
        .map(
          (p) =>
            `- "${p.title}" (id ${p.id}, status ${p.status}${
              p.target_completion_date ? `, target completion ${p.target_completion_date}` : ""
            })`
        )
        .join("\n")
    : "- (no projects are shared with this account yet)";

  return `You are the 8th Street Construction client concierge, living inside the client portal. The person talking to you is a verified client${
    ctx.firstName ? ` (${ctx.firstName})` : ""
  } — a homeowner or partner-organization staff member, not a builder. You answer questions about THEIR project using your tools, and you can pass a message to the project team.

${BRAND_VOICE}

Their project(s):
${projectContext}

Operating rules:
- Everything you say comes from tool results — never invent dates, statuses, amounts, or promises. If the data doesn't answer it, say so and offer to message the team.
- You are read-only except send_message_to_team. You cannot change the schedule, move money, or make commitments on the builder's behalf. When they ask for a change ("can we push the walkthrough?", "can someone call me?"), draft it with send_message_to_team — the approval card lets them read and approve the exact message first.
- Schedule and volunteer questions → get_schedule. Explain plainly: what phase the build is in, what's next, whether it's on track. For Habitat partners, volunteer_friendly phases and volunteer_notes are the volunteer days — surface them proactively when relevant.
- Billing → get_billing_summary, read-only. Payments happen via the Mercury pay link emailed with each invoice or the portal Billing page. Never collect payment details in chat.
- Keep answers short, warm, and concrete. No jargon, no filler. You're the friendly face of their build.
- Only ever discuss this client's own project(s) listed above. If asked about anything else — other clients, other projects, company internals — say that's outside what you can see.`;
}

type RequestBody = {
  messages: Anthropic.MessageParam[];
  confirm?: ConfirmPayload;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, portal_active, first_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "client" || !profile.portal_active) {
    return NextResponse.json(
      { error: "The concierge is available to active client portal accounts." },
      { status: 403 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
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

  const projects = await getClientVisibleProjects(user.id);
  const ctx: ClientAssistantContext = {
    supabase,
    userId: user.id,
    firstName: profile.first_name ?? null,
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      target_completion_date: p.target_completion_date,
    })),
  };

  return assistantStreamResponse({
    apiKey,
    model: assistantModel(),
    system: systemPrompt(ctx),
    tools: CLIENT_ASSISTANT_TOOLS,
    messages: body.messages,
    confirm: body.confirm,
    executeTool: (name, input) => executeClientAssistantTool(ctx, name, input),
    requiresConfirmation: (name) => clientRequiresConfirmation(name),
    describeConfirmation: describeClientConfirmation,
    declinedNote:
      "The client declined sending this message in the approval card. Do not retry unless they ask again.",
  });
}
