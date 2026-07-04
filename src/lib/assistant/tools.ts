import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createCustomInvoice,
  sendCustomInvoice,
  markInvoicePaid,
} from "@/lib/actions/billing";
import { formatMoney } from "@/lib/billing/constants";

/**
 * Admin assistant tool surface. Read tools run directly against the admin
 * Supabase client (the route has already verified the caller is an admin).
 * Money tools delegate to the same server actions the billing UI uses, so
 * the Mercury push + client email path is identical to clicking the button.
 */

export type AssistantToolName =
  | "list_projects"
  | "find_people"
  | "get_project_billing"
  | "list_recent_leads"
  | "company_snapshot"
  | "create_project"
  | "create_invoice"
  | "send_invoice"
  | "mark_invoice_paid";

type LineItemInput = { description: string; quantity: number; unit_amount: number };

export type CreateInvoiceInput = {
  project_id: string;
  title: string;
  line_items: LineItemInput[];
  due_date?: string;
  notes?: string;
  send_now?: boolean;
};

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_projects",
    description:
      "List all projects/jobs with their client, status, and contract value. Call this first to resolve a project or client the user mentions by name (e.g. 'habitat' matches the Habitat for Humanity job).",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "find_people",
    description:
      "Search portal users (clients, subs, admins) by name or email fragment. Use when the user references a person and you need their profile.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name or email fragment, e.g. 'habitat' or 'bernadette'" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_project_billing",
    description:
      "Get the billing picture for one project: contract value, payment draws, and every invoice with id, number, title, status, total, amount paid, and Mercury status. Call before creating, sending, or marking invoices paid.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project UUID from list_projects" },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_recent_leads",
    description: "List the most recent inbound leads with status and contact info.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max leads to return (default 10)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "company_snapshot",
    description:
      "Company-wide money snapshot: active job count, open invoice count, and total outstanding accounts receivable.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "create_project",
    description:
      "Create a new project/job. Use when the admin references a job that doesn't exist yet. status 'draft' keeps it OFF the public marketing site (recommended for operational jobs); any other status publishes it. Optionally link the client (from find_people) so invoicing works immediately, and seed the standard build-phase playbook.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Job title, e.g. '1137 Merry Street'" },
        category: {
          type: "string",
          enum: [
            "custom_home",
            "residential_renovation",
            "commercial_new_build",
            "tenant_buildout",
            "design_build",
            "historic_restoration",
          ],
          description: "Project category (default design_build)",
        },
        status: {
          type: "string",
          enum: ["draft", "pre_construction", "in_progress", "completed", "on_hold"],
          description: "Default 'draft' (internal only, hidden from the public site)",
        },
        location: { type: "string", description: "City/neighborhood, e.g. 'Augusta, GA'" },
        street_address: { type: "string" },
        client_id: {
          type: "string",
          description: "Profile UUID from find_people — links the client and enables their portal + invoicing",
        },
        apply_playbook: {
          type: "boolean",
          description: "Seed standard Georgia residential build phases/tasks (default true)",
        },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "create_invoice",
    description:
      "Create an invoice on a project. With send_now=true it is pushed to Mercury (ACH pay link) and emailed to the client immediately; with send_now=false it is saved as a draft. Amounts are in dollars. Always confirm the project, amount, and line items with get_project_billing / list_projects first.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project UUID" },
        title: { type: "string", description: "Invoice title, e.g. 'Draw 3: Framing complete'" },
        line_items: {
          type: "array",
          description: "One or more billable lines",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unit_amount: { type: "number", description: "Dollar amount per unit" },
            },
            required: ["description", "quantity", "unit_amount"],
            additionalProperties: false,
          },
        },
        due_date: { type: "string", description: "YYYY-MM-DD (optional, defaults to net-30 at Mercury)" },
        notes: { type: "string", description: "Internal notes (optional)" },
        send_now: {
          type: "boolean",
          description: "true = send to client now (Mercury + email). false = save draft.",
        },
      },
      required: ["project_id", "title", "line_items"],
      additionalProperties: false,
    },
  },
  {
    name: "send_invoice",
    description:
      "Send an existing DRAFT invoice to the project's client — pushes it to Mercury for ACH payment and emails the pay link.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        invoice_id: { type: "string", description: "Invoice UUID from get_project_billing" },
      },
      required: ["project_id", "invoice_id"],
      additionalProperties: false,
    },
  },
  {
    name: "mark_invoice_paid",
    description:
      "Manually mark an invoice as paid in full (e.g. a check or wire arrived outside Mercury). Updates the invoice and its linked draw.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        invoice_id: { type: "string" },
      },
      required: ["project_id", "invoice_id"],
      additionalProperties: false,
    },
  },
];

/**
 * Money moves (or client-visible sends) require an explicit human approval
 * in the chat UI before the tool executes. Draft creation is reversible, so
 * it runs without a gate.
 */
export function requiresConfirmation(name: string, input: unknown): boolean {
  if (name === "send_invoice" || name === "mark_invoice_paid") return true;
  if (name === "create_invoice") {
    return Boolean((input as CreateInvoiceInput)?.send_now);
  }
  return false;
}

/** Human-readable summary of a gated action for the confirmation card. */
export function describeConfirmation(name: string, input: unknown): string {
  const i = input as Record<string, unknown>;
  if (name === "create_invoice") {
    const items = (i.line_items as LineItemInput[]) ?? [];
    const total = items.reduce(
      (sum, li) => sum + Math.round(Number(li.quantity) * Number(li.unit_amount) * 100) / 100,
      0
    );
    return `Create and send invoice "${String(i.title)}" for ${formatMoney(total)} — the client will receive a Mercury ACH pay link by email.`;
  }
  if (name === "send_invoice") {
    return "Send this draft invoice to the client — pushes to Mercury and emails the ACH pay link.";
  }
  if (name === "mark_invoice_paid") {
    return "Mark this invoice paid in full. This updates the books and may notify the client.";
  }
  return `Run ${name}.`;
}

function toFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function latestInvoiceForProject(projectId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("invoices")
    .select("id, invoice_number, title, status, total, mercury_pay_slug")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Execute a tool call. Returns a JSON-serializable result for the model. */
export async function executeAssistantTool(
  name: string,
  input: unknown
): Promise<unknown> {
  const admin = createAdminClient();
  const i = input as Record<string, unknown>;

  switch (name as AssistantToolName) {
    case "list_projects": {
      const { data: projects, error } = await admin
        .from("projects")
        .select("id, title, slug, status, contract_value, client_id, funding_type")
        .order("updated_at", { ascending: false });
      if (error) return { error: error.message };

      const clientIds = [
        ...new Set((projects ?? []).map((p) => p.client_id).filter(Boolean)),
      ] as string[];
      const { data: profiles } = clientIds.length
        ? await admin
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", clientIds)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (projects ?? []).map((p) => {
        const c = p.client_id ? byId.get(p.client_id) : null;
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          contract_value: p.contract_value,
          funding_type: p.funding_type ?? null,
          client: c
            ? {
                id: c.id,
                name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email,
                email: c.email,
              }
            : null,
        };
      });
    }

    case "find_people": {
      const q = String(i.query ?? "").trim();
      if (!q) return { error: "query is required" };
      const { data } = await admin
        .from("profiles")
        .select("id, first_name, last_name, email, role")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(20);
      return (data ?? []).map((p) => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
        email: p.email,
        role: p.role,
      }));
    }

    case "get_project_billing": {
      const projectId = String(i.project_id ?? "");
      const [{ data: project }, { data: invoices }, { data: draws }] = await Promise.all([
        admin
          .from("projects")
          .select("id, title, slug, status, contract_value, client_id")
          .eq("id", projectId)
          .single(),
        admin
          .from("invoices")
          .select(
            "id, invoice_number, title, status, subtotal, total, amount_paid, due_date, sent_at, paid_at, mercury_status, mercury_pay_slug"
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        admin
          .from("payment_draws")
          .select("id, draw_number, title, amount, status, scheduled_date, invoice_id")
          .eq("project_id", projectId)
          .order("draw_number", { ascending: true }),
      ]);
      if (!project) return { error: "Project not found" };

      const open = (invoices ?? []).filter(
        (inv) => inv.status !== "paid" && inv.status !== "void"
      );
      const outstanding = open.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0)),
        0
      );

      return { project, outstanding, invoices: invoices ?? [], draws: draws ?? [] };
    }

    case "list_recent_leads": {
      const limit = Math.min(Number(i.limit) || 10, 50);
      const { data } = await admin
        .from("leads")
        .select("id, name, email, phone, project_type, budget_range, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    }

    case "company_snapshot": {
      const [{ data: projects }, { data: invoices }] = await Promise.all([
        admin.from("projects").select("id, status"),
        admin.from("invoices").select("status, total, amount_paid"),
      ]);
      const active = (projects ?? []).filter(
        (p) => p.status !== "completed" && p.status !== "archived"
      ).length;
      const open = (invoices ?? []).filter(
        (inv) => inv.status !== "paid" && inv.status !== "void" && inv.status !== "draft"
      );
      const outstanding = open.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0)),
        0
      );
      return {
        active_projects: active,
        total_projects: (projects ?? []).length,
        open_invoices: open.length,
        outstanding_receivables: outstanding,
        outstanding_formatted: formatMoney(outstanding),
      };
    }

    case "create_project": {
      const title = String(i.title ?? "").trim();
      if (!title) return { error: "title is required" };
      const { slugifyProjectTitle } = await import("@/lib/utils");
      const slug = slugifyProjectTitle(title);
      if (!slug) return { error: "Could not derive a slug from that title" };

      const status = String(i.status ?? "draft");
      const { data: project, error } = await admin
        .from("projects")
        .insert({
          slug,
          title,
          category: String(i.category ?? "design_build"),
          status,
          location: String(i.location ?? "").trim() || null,
          street_address: String(i.street_address ?? "").trim() || null,
          published_at: status !== "draft" ? new Date().toISOString() : null,
          ...(i.client_id
            ? { client_id: String(i.client_id), client_portal_enabled: true }
            : {}),
        })
        .select("id, title, slug, status, client_id")
        .single();
      if (error || !project) return { error: error?.message ?? "Could not create project" };

      if (i.apply_playbook !== false) {
        try {
          const { applyPlaybookToProject } = await import("@/lib/build/apply-playbook");
          const { DEFAULT_PLAYBOOK_ID } = await import("@/lib/build/playbook-registry");
          await applyPlaybookToProject(project.id, DEFAULT_PLAYBOOK_ID, {});
        } catch (err) {
          console.error("Playbook seeding failed:", err);
        }
      }

      return { ok: true, project };
    }

    case "create_invoice": {
      const input = i as unknown as CreateInvoiceInput;
      await createCustomInvoice(
        toFormData({
          project_id: input.project_id,
          title: input.title,
          notes: input.notes ?? "",
          due_date: input.due_date ?? "",
          send_now: input.send_now ? "on" : "off",
          line_items: JSON.stringify(input.line_items ?? []),
        })
      );
      const invoice = await latestInvoiceForProject(input.project_id);
      return {
        ok: true,
        action: input.send_now ? "created_and_sent" : "created_draft",
        invoice,
      };
    }

    case "send_invoice": {
      await sendCustomInvoice(
        toFormData({
          project_id: String(i.project_id ?? ""),
          invoice_id: String(i.invoice_id ?? ""),
        })
      );
      return { ok: true, action: "sent" };
    }

    case "mark_invoice_paid": {
      await markInvoicePaid(
        toFormData({
          project_id: String(i.project_id ?? ""),
          invoice_id: String(i.invoice_id ?? ""),
        })
      );
      return { ok: true, action: "marked_paid" };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
