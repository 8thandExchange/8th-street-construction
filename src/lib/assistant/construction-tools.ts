import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Read-only RFIs and submittals for the admin assistant.
 * Writes stay on the job page so a question or product decision is never
 * invented in chat.
 */

export const CONSTRUCTION_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_rfis",
    description:
      "RFIs (requests for information) on one job or across the company: number, title, trade, status (draft / open / answered / closed / void), schedule impact, and whether an answer is on the record. Use for 'what questions are outstanding', 'did the client answer the window RFI', or before telling someone the build is waiting.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Limit to one job (optional)" },
        status: {
          type: "string",
          enum: ["draft", "open", "answered", "closed", "void"],
          description: "Limit to one status (optional)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_submittals",
    description:
      "Product and shop-drawing submittals: number, title, trade, spec section, status (draft / submitted / in review / approved / approved as noted / rejected / void), due date, and reviewer notes. Use for 'what still needs a decision' or 'was the window package approved'.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Limit to one job (optional)" },
        status: {
          type: "string",
          enum: [
            "draft",
            "submitted",
            "in_review",
            "approved",
            "approved_as_noted",
            "rejected",
            "void",
          ],
          description: "Limit to one status (optional)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_service_requests",
    description:
      "Warranty and service requests after (or near) closeout: number, title, category (warranty / service), status, owner, vendor, SLA due date, and whether closeout notes exist. Use for 'what's past SLA', 'did we close the faucet leak', or 'who owns warranty items'.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Limit to one job (optional)" },
        status: {
          type: "string",
          enum: [
            "draft",
            "open",
            "assigned",
            "in_progress",
            "waiting_client",
            "resolved",
            "closed",
            "void",
          ],
        },
      },
      additionalProperties: false,
    },
  },
];

export const CONSTRUCTION_TOOL_NAMES = new Set(CONSTRUCTION_TOOLS.map((t) => t.name));

export async function executeConstructionTool(name: string, input: unknown): Promise<unknown> {
  const admin = createAdminClient();
  const i = (input ?? {}) as Record<string, unknown>;

  switch (name) {
    case "list_rfis": {
      let query = admin
        .from("project_rfis")
        .select(
          "id, project_id, number, title, trade, status, schedule_impact, days_impact, answer, answered_at, created_at, project:projects(title)"
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (i.project_id) query = query.eq("project_id", String(i.project_id));
      if (i.status) query = query.eq("status", String(i.status));
      const { data, error } = await query;
      if (error) return { error: error.message };
      return {
        rfis: (data ?? []).map((row) => {
          const project = Array.isArray(row.project) ? row.project[0] : row.project;
          return {
            id: row.id,
            project_id: row.project_id,
            project: project?.title ?? null,
            number: row.number,
            title: row.title,
            trade: row.trade,
            status: row.status,
            schedule_impact: row.schedule_impact,
            days_impact: row.days_impact,
            has_answer: Boolean(row.answer),
            answered_at: row.answered_at,
            admin_url: `/admin/projects/${row.project_id}/rfis`,
          };
        }),
      };
    }
    case "list_submittals": {
      let query = admin
        .from("project_submittals")
        .select(
          "id, project_id, number, title, trade, spec_section, status, due_date, reviewer_notes, created_at, project:projects(title)"
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (i.project_id) query = query.eq("project_id", String(i.project_id));
      if (i.status) query = query.eq("status", String(i.status));
      const { data, error } = await query;
      if (error) return { error: error.message };
      return {
        submittals: (data ?? []).map((row) => {
          const project = Array.isArray(row.project) ? row.project[0] : row.project;
          return {
            id: row.id,
            project_id: row.project_id,
            project: project?.title ?? null,
            number: row.number,
            title: row.title,
            trade: row.trade,
            spec_section: row.spec_section,
            status: row.status,
            due_date: row.due_date,
            reviewer_notes: row.reviewer_notes,
            admin_url: `/admin/projects/${row.project_id}/rfis`,
          };
        }),
      };
    }
    case "list_service_requests": {
      let query = admin
        .from("project_service_requests")
        .select(
          "id, project_id, number, title, category, status, sla_due, closeout_note, owner_id, vendor_id, created_at, project:projects(title)"
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (i.project_id) query = query.eq("project_id", String(i.project_id));
      if (i.status) query = query.eq("status", String(i.status));
      const { data, error } = await query;
      if (error) return { error: error.message };
      return {
        requests: (data ?? []).map((row) => {
          const project = Array.isArray(row.project) ? row.project[0] : row.project;
          return {
            id: row.id,
            project_id: row.project_id,
            project: project?.title ?? null,
            number: row.number,
            title: row.title,
            category: row.category,
            status: row.status,
            sla_due: row.sla_due,
            has_closeout_note: Boolean(row.closeout_note),
            admin_url: `/admin/projects/${row.project_id}/service`,
          };
        }),
      };
    }
    default:
      return { error: `Unknown construction tool: ${name}` };
  }
}
