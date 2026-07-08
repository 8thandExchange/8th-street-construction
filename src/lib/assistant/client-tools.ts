import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { formatMoney } from "@/lib/billing/constants";

/**
 * Client concierge tool surface. Every read runs on the signed-in client's
 * OWN Supabase session, so row-level security scopes results to projects
 * they can access — the assistant is structurally unable to read another
 * client's data. The only write (send_message_to_team) is approval-gated
 * in the chat UI and also constrained by the message-insert RLS policy.
 */

export type ClientProjectRef = {
  id: string;
  title: string;
  status: string;
  target_completion_date: string | null;
};

export type ClientAssistantContext = {
  supabase: SupabaseClient;
  userId: string;
  firstName: string | null;
  projects: ClientProjectRef[];
};

export type ClientAssistantToolName =
  | "get_schedule"
  | "get_recent_updates"
  | "get_billing_summary"
  | "get_documents"
  | "get_messages"
  | "send_message_to_team";

const PROJECT_ID_PROP = {
  project_id: {
    type: "string" as const,
    description:
      "Project UUID. May be omitted when the client has exactly one project.",
  },
};

export const CLIENT_ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_schedule",
    description:
      "The client's build schedule: every phase with dates, status, days late (if past target), task progress, and volunteer-stage info (which phases welcome volunteer crews, with notes). Call before answering any schedule, timeline, progress, or volunteer question.",
    input_schema: {
      type: "object",
      properties: { ...PROJECT_ID_PROP },
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_updates",
    description:
      "Recent progress updates the team has posted for the client's project (title, body, date). Use for 'what happened this week' style questions.",
    input_schema: {
      type: "object",
      properties: {
        ...PROJECT_ID_PROP,
        limit: { type: "integer", description: "Max updates to return (default 5, max 20)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_billing_summary",
    description:
      "Read-only billing picture for the client's project: each invoice (number, title, status, total, paid, due date) plus payment draws and the outstanding balance. Payments themselves happen through the emailed Mercury pay link or the portal Billing page — you cannot move money.",
    input_schema: {
      type: "object",
      properties: { ...PROJECT_ID_PROP },
      additionalProperties: false,
    },
  },
  {
    name: "get_documents",
    description:
      "List documents shared with the client (title, category, file type, date). Downloads happen on the portal Documents page — mention it when relevant.",
    input_schema: {
      type: "object",
      properties: { ...PROJECT_ID_PROP },
      additionalProperties: false,
    },
  },
  {
    name: "get_messages",
    description:
      "Recent messages between the client and the project team, oldest first. Use to recall what was already discussed or promised.",
    input_schema: {
      type: "object",
      properties: {
        ...PROJECT_ID_PROP,
        limit: { type: "integer", description: "Max messages to return (default 10, max 30)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "send_message_to_team",
    description:
      "Send a message to the 8th Street project team on the client's behalf — the team is notified by email, SMS, and push. Use when the client asks for something you cannot do (change a date, request a visit, billing questions needing a human) or explicitly asks to pass something along. Write the message in the client's own words or a faithful summary they have seen.",
    input_schema: {
      type: "object",
      properties: {
        ...PROJECT_ID_PROP,
        body: { type: "string", description: "The message text exactly as the team will read it" },
      },
      required: ["body"],
      additionalProperties: false,
    },
  },
];

/** The only write — sending a message — waits for an in-chat approval. */
export function clientRequiresConfirmation(name: string): boolean {
  return name === "send_message_to_team";
}

export function describeClientConfirmation(name: string, input: unknown): string {
  const i = input as Record<string, unknown>;
  if (name === "send_message_to_team") {
    const body = String(i.body ?? "");
    const preview = body.length > 280 ? `${body.slice(0, 280)}…` : body;
    return `Send this message to your 8th Street project team (they'll be notified right away):\n\n"${preview}"`;
  }
  return `Run ${name}.`;
}

function resolveProject(
  ctx: ClientAssistantContext,
  input: Record<string, unknown>
): ClientProjectRef | { error: string } {
  const requested = input.project_id ? String(input.project_id) : null;
  if (requested) {
    const match = ctx.projects.find((p) => p.id === requested);
    return match ?? { error: "That project is not available on this account." };
  }
  if (ctx.projects.length === 1) return ctx.projects[0];
  if (ctx.projects.length === 0) {
    return { error: "No projects are shared with this account yet." };
  }
  return {
    error: `Multiple projects on this account — pass project_id. Options: ${ctx.projects
      .map((p) => `${p.title} (${p.id})`)
      .join(", ")}`,
  };
}

export async function executeClientAssistantTool(
  ctx: ClientAssistantContext,
  name: string,
  input: unknown
): Promise<unknown> {
  const i = (input ?? {}) as Record<string, unknown>;
  const project = resolveProject(ctx, i);
  if ("error" in project) return project;
  const { supabase } = ctx;

  switch (name as ClientAssistantToolName) {
    case "get_schedule": {
      const [{ data: milestones }, { data: tasks }] = await Promise.all([
        supabase
          .from("project_milestones")
          .select(
            "id, title, description, status, scheduled_start, scheduled_end, target_date, completed_at, volunteer_friendly, volunteer_notes"
          )
          .eq("project_id", project.id)
          .order("display_order", { ascending: true }),
        supabase
          .from("project_tasks")
          .select("milestone_id, status, title, due_date")
          .eq("project_id", project.id),
      ]);

      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const phases = (milestones ?? []).map((m) => {
        const phaseTasks = (tasks ?? []).filter((t) => t.milestone_id === m.id);
        const doneCount = phaseTasks.filter((t) => t.status === "done").length;
        const end = m.target_date ? new Date(`${m.target_date}T12:00:00`) : null;
        const daysLate =
          m.status !== "completed" && end && end < today
            ? Math.max(1, Math.floor((today.getTime() - end.getTime()) / 86_400_000))
            : 0;
        return {
          title: m.title,
          description: m.description ?? null,
          status: m.status,
          scheduled_start: m.scheduled_start,
          target_date: m.target_date,
          completed_at: m.completed_at,
          days_late: daysLate,
          tasks_done: doneCount,
          tasks_total: phaseTasks.length,
          volunteer_friendly: m.volunteer_friendly ?? false,
          volunteer_notes: m.volunteer_notes ?? null,
        };
      });

      return {
        project: {
          title: project.title,
          status: project.status,
          target_completion_date: project.target_completion_date,
        },
        current_phase: phases.find((p) => p.status === "in_progress")?.title ?? null,
        volunteer_stages: phases
          .filter((p) => p.volunteer_friendly)
          .map((p) => ({ phase: p.title, notes: p.volunteer_notes, target_date: p.target_date })),
        phases,
      };
    }

    case "get_recent_updates": {
      const limit = Math.min(Number(i.limit) || 5, 20);
      const { data } = await supabase
        .from("project_updates")
        .select("title, body, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return { project: project.title, updates: data ?? [] };
    }

    case "get_billing_summary": {
      const [{ data: invoices }, { data: draws }] = await Promise.all([
        supabase
          .from("invoices")
          .select("invoice_number, title, status, total, amount_paid, due_date, sent_at, paid_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("payment_draws")
          .select("draw_number, title, amount, status, scheduled_date")
          .eq("project_id", project.id)
          .order("draw_number", { ascending: true }),
      ]);
      const open = (invoices ?? []).filter(
        (inv) => inv.status !== "paid" && inv.status !== "void" && inv.status !== "draft"
      );
      const outstanding = open.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0)),
        0
      );
      return {
        project: project.title,
        outstanding,
        outstanding_formatted: formatMoney(outstanding),
        invoices: (invoices ?? []).filter((inv) => inv.status !== "draft"),
        draws: draws ?? [],
        billing_page: `/client/projects/${project.id}/billing`,
      };
    }

    case "get_documents": {
      const { data } = await supabase
        .from("project_documents")
        .select("title, description, category, file_type, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return {
        project: project.title,
        documents: data ?? [],
        documents_page: `/client/projects/${project.id}/documents`,
      };
    }

    case "get_messages": {
      const limit = Math.min(Number(i.limit) || 10, 30);
      const { data } = await supabase
        .from("project_messages")
        .select("author_id, body, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return {
        project: project.title,
        messages: (data ?? []).reverse().map((m) => ({
          from: m.author_id === ctx.userId ? "you" : "team_or_other_member",
          body: m.body,
          created_at: m.created_at,
        })),
      };
    }

    case "send_message_to_team": {
      const body = String(i.body ?? "").trim();
      if (!body) return { error: "Message cannot be empty" };

      // RLS also enforces author_id = auth.uid() + portal access on insert.
      const { error } = await supabase.from("project_messages").insert({
        project_id: project.id,
        author_id: ctx.userId,
        body,
        read_by: [ctx.userId],
      });
      if (error) return { error: error.message };

      const preview = body.length > 240 ? `${body.slice(0, 240)}…` : body;
      const [{ sendClientMessageAdminEmail }, { sendAdminSms }, { sendPushToAdmins }] =
        await Promise.all([
          import("@/lib/email/project-notify"),
          import("@/lib/sms/ghl"),
          import("@/lib/notify/push"),
        ]);
      await sendClientMessageAdminEmail({
        projectTitle: project.title,
        projectId: project.id,
        preview,
      });
      await sendAdminSms(
        `8th Street portal: client message on ${project.title} — "${preview.slice(0, 120)}"`
      );
      await sendPushToAdmins({
        title: `Client message — ${project.title}`,
        body: preview.slice(0, 140),
        url: `/admin/projects/${project.id}/messages`,
        tag: `msg-${project.id}`,
      });

      revalidatePath(`/admin/projects/${project.id}/messages`);
      revalidatePath(`/client/projects/${project.id}/messages`);
      return { ok: true, action: "message_sent_team_notified" };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
