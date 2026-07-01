import { createClient } from "@/lib/supabase/server";
import { computeBillingSummary } from "@/lib/billing/summary";
import { computeProjectCostSummary } from "@/lib/estimate/summary";
import type { ProjectCostSummary } from "@/lib/estimate/summary";
import type { BillingSummary } from "@/lib/billing/summary";

export type ActivityKind =
  | "update"
  | "field_note"
  | "message"
  | "milestone"
  | "invoice"
  | "change_order"
  | "selection"
  | "document";

export type DashboardActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  at: string;
  href?: string;
};

export type DashboardAction = {
  id: string;
  severity: "critical" | "warning" | "info";
  label: string;
  hint?: string;
  href: string;
};

export type DashboardMilestone = {
  id: string;
  title: string;
  status: string;
  target_date: string | null;
};

export type DashboardPhoto = {
  id: string;
  url: string;
  caption: string | null;
  updateTitle: string;
  updateId: string;
  at: string;
};

export type AdminCommandCenterData = {
  activities: DashboardActivity[];
  costSummary: ProjectCostSummary;
  billingSummary: BillingSummary;
  changeOrderTotal: number;
};

export type ClientCommandCenterData = {
  activities: DashboardActivity[];
  actions: DashboardAction[];
  milestones: DashboardMilestone[];
  photos: DashboardPhoto[];
  billingSummary: BillingSummary;
  progressPct: number;
  completedPhases: number;
  totalPhases: number;
  updateCount: number;
  documentCount: number;
};

const KIND_LABELS: Record<ActivityKind, string> = {
  update: "Update",
  field_note: "Field note",
  message: "Message",
  milestone: "Milestone",
  invoice: "Invoice",
  change_order: "Change order",
  selection: "Selection",
  document: "Document",
};

export function activityKindLabel(kind: ActivityKind): string {
  return KIND_LABELS[kind];
}

function sortByAtDesc(items: DashboardActivity[]): DashboardActivity[] {
  return [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export async function loadAdminCommandCenter(
  projectId: string,
  base: string,
  costInputs: {
    estimatedCost: number;
    clientContract: number;
    estimateLines: Parameters<typeof computeProjectCostSummary>[2];
    awardedBids: number;
  }
): Promise<AdminCommandCenterData> {
  const supabase = await createClient();

  const [
    updatesRes,
    logsRes,
    messagesRes,
    milestonesRes,
    invoicesRes,
    changeOrdersRes,
    selectionsRes,
    documentsRes,
    drawsRes,
    changeOrdersSumRes,
  ] = await Promise.all([
    supabase
      .from("project_updates")
      .select("id, title, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("project_daily_logs")
      .select("id, summary, log_date, created_at")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false })
      .limit(6),
    supabase
      .from("project_messages")
      .select("id, body, created_at, sender_role")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("project_milestones")
      .select("id, title, status, completed_at, updated_at")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("id, title, status, updated_at, created_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("change_orders")
      .select("id, title, status, updated_at, created_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("project_selections")
      .select("id, title, status, updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("project_documents")
      .select("id, title, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("payment_draws")
      .select("amount, status")
      .eq("project_id", projectId),
    supabase
      .from("change_orders")
      .select("cost_impact, status")
      .eq("project_id", projectId)
      .eq("status", "approved"),
  ]);

  const activities: DashboardActivity[] = [];

  for (const u of updatesRes.data ?? []) {
    activities.push({
      id: `update-${u.id}`,
      kind: "update",
      title: u.title,
      at: u.created_at,
      href: `${base}/updates`,
    });
  }

  for (const log of logsRes.data ?? []) {
    activities.push({
      id: `log-${log.id}`,
      kind: "field_note",
      title: log.summary.slice(0, 80) + (log.summary.length > 80 ? "…" : ""),
      detail: log.log_date,
      at: log.created_at ?? `${log.log_date}T12:00:00`,
      href: `${base}/daily-logs`,
    });
  }

  for (const m of messagesRes.data ?? []) {
    const preview = (m.body ?? "").slice(0, 72);
    activities.push({
      id: `msg-${m.id}`,
      kind: "message",
      title: preview + ((m.body?.length ?? 0) > 72 ? "…" : ""),
      detail: m.sender_role === "client" ? "From client" : "From team",
      at: m.created_at,
      href: `${base}/messages`,
    });
  }

  for (const ms of milestonesRes.data ?? []) {
    activities.push({
      id: `ms-${ms.id}`,
      kind: "milestone",
      title: `${ms.title} completed`,
      at: ms.completed_at ?? ms.updated_at,
      href: `${base}/milestones`,
    });
  }

  for (const inv of invoicesRes.data ?? []) {
    if (inv.status === "draft") continue;
    activities.push({
      id: `inv-${inv.id}`,
      kind: "invoice",
      title: inv.title ?? "Invoice",
      detail: inv.status.replace("_", " "),
      at: inv.updated_at ?? inv.created_at,
      href: `${base}/billing`,
    });
  }

  for (const co of changeOrdersRes.data ?? []) {
    activities.push({
      id: `co-${co.id}`,
      kind: "change_order",
      title: co.title,
      detail: co.status.replace("_", " "),
      at: co.updated_at ?? co.created_at,
      href: `${base}/change-orders`,
    });
  }

  for (const sel of selectionsRes.data ?? []) {
    if (sel.status === "pending") continue;
    activities.push({
      id: `sel-${sel.id}`,
      kind: "selection",
      title: sel.title,
      detail: sel.status.replace("_", " "),
      at: sel.updated_at,
      href: `${base}/selections`,
    });
  }

  for (const doc of documentsRes.data ?? []) {
    activities.push({
      id: `doc-${doc.id}`,
      kind: "document",
      title: doc.title,
      at: doc.created_at,
      href: `${base}/documents`,
    });
  }

  const changeOrderTotal = (changeOrdersSumRes.data ?? []).reduce(
    (s, c) => s + Number(c.cost_impact ?? 0),
    0
  );

  const costSummary = computeProjectCostSummary(
    costInputs.estimatedCost,
    costInputs.clientContract,
    costInputs.estimateLines,
    costInputs.awardedBids
  );

  const billingSummary = computeBillingSummary(
    costInputs.clientContract,
    changeOrderTotal,
    drawsRes.data ?? []
  );

  return {
    activities: sortByAtDesc(activities).slice(0, 12),
    costSummary,
    billingSummary,
    changeOrderTotal,
  };
}

export async function loadClientCommandCenter(projectId: string): Promise<ClientCommandCenterData | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const base = `/client/projects/${projectId}`;

  const { data: project } = await supabase
    .from("projects")
    .select("id, contract_value")
    .eq("id", projectId)
    .single();

  if (!project) return null;

  const [
    milestonesRes,
    updatesRes,
    documentsRes,
    selectionsRes,
    invoicesRes,
    pendingPlanSetsRes,
    changeOrdersRes,
    messagesRes,
    drawsRes,
    changeOrdersSumRes,
  ] = await Promise.all([
    supabase
      .from("project_milestones")
      .select("id, title, status, target_date")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true }),
    supabase
      .from("project_updates")
      .select("id, title, body, created_at, project_update_images(id, public_url, caption)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("project_documents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("visibility", "client"),
    supabase
      .from("project_selections")
      .select("id, title, status, due_date")
      .eq("project_id", projectId)
      .eq("client_visible", true),
    supabase
      .from("invoices")
      .select("id, title, status, total, due_date")
      .eq("project_id", projectId)
      .neq("status", "paid")
      .neq("status", "void"),
    supabase
      .from("project_plan_sets")
      .select("id, title, version")
      .eq("project_id", projectId)
      .eq("status", "pending_client"),
    supabase
      .from("change_orders")
      .select("id, title, status, created_at")
      .eq("project_id", projectId)
      .eq("status", "pending_client"),
    supabase
      .from("project_messages")
      .select("id, body, created_at, sender_role")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("payment_draws")
      .select("amount, status")
      .eq("project_id", projectId),
    supabase
      .from("change_orders")
      .select("cost_impact")
      .eq("project_id", projectId)
      .eq("status", "approved"),
  ]);

  const milestones = milestonesRes.data ?? [];
  const completedPhases = milestones.filter((m) => m.status === "completed").length;
  const totalPhases = milestones.length;
  const progressPct = totalPhases ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const actions: DashboardAction[] = [];

  const selectionsDue = (selectionsRes.data ?? []).filter(
    (s) =>
      s.status === "client_review" ||
      (s.due_date && s.due_date <= today && s.status !== "approved")
  );
  for (const s of selectionsDue) {
    actions.push({
      id: `sel-${s.id}`,
      severity: s.due_date && s.due_date < today ? "critical" : "warning",
      label: `Review selection: ${s.title}`,
      hint: s.due_date ? `Due ${s.due_date}` : undefined,
      href: `${base}/selections`,
    });
  }

  for (const inv of invoicesRes.data ?? []) {
    actions.push({
      id: `inv-${inv.id}`,
      severity: inv.due_date && inv.due_date < today ? "critical" : "info",
      label: inv.title ?? "Invoice ready to pay",
      hint: inv.total ? `$${Number(inv.total).toLocaleString()}` : undefined,
      href: `${base}/billing`,
    });
  }

  for (const ps of pendingPlanSetsRes.data ?? []) {
    actions.push({
      id: `plan-${ps.id}`,
      severity: "warning",
      label: `Sign off on plans: ${ps.title}`,
      hint: ps.version ? `Version ${ps.version}` : undefined,
      href: `${base}/plans`,
    });
  }

  for (const co of changeOrdersRes.data ?? []) {
    actions.push({
      id: `co-${co.id}`,
      severity: "warning",
      label: `Approve change order: ${co.title}`,
      href: `${base}/change-orders`,
    });
  }

  const activities: DashboardActivity[] = [];

  for (const u of updatesRes.data ?? []) {
    activities.push({
      id: `update-${u.id}`,
      kind: "update",
      title: u.title,
      at: u.created_at,
      href: `${base}/updates`,
    });
  }

  for (const m of messagesRes.data ?? []) {
    if (m.sender_role !== "admin") continue;
    const preview = (m.body ?? "").slice(0, 72);
    activities.push({
      id: `msg-${m.id}`,
      kind: "message",
      title: preview + ((m.body?.length ?? 0) > 72 ? "…" : ""),
      detail: "From your builder",
      at: m.created_at,
      href: `${base}/messages`,
    });
  }

  for (const ms of milestones.filter((m) => m.status === "completed")) {
    activities.push({
      id: `ms-${ms.id}`,
      kind: "milestone",
      title: `${ms.title} completed`,
      at: ms.target_date ? `${ms.target_date}T12:00:00` : new Date().toISOString(),
      href: `${base}/schedule`,
    });
  }

  const photos: DashboardPhoto[] = [];
  for (const u of updatesRes.data ?? []) {
    const images = u.project_update_images ?? [];
    for (const img of images) {
      photos.push({
        id: img.id,
        url: img.public_url,
        caption: img.caption,
        updateTitle: u.title,
        updateId: u.id,
        at: u.created_at,
      });
    }
    if (photos.length >= 8) break;
  }

  const changeOrderTotal = (changeOrdersSumRes.data ?? []).reduce(
    (s, c) => s + Number(c.cost_impact ?? 0),
    0
  );

  const billingSummary = computeBillingSummary(
    Number(project.contract_value ?? 0),
    changeOrderTotal,
    drawsRes.data ?? []
  );

  return {
    activities: sortByAtDesc(activities).slice(0, 10),
    actions,
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      target_date: m.target_date,
    })),
    photos: photos.slice(0, 8),
    billingSummary,
    progressPct,
    completedPhases,
    totalPhases,
    updateCount: updatesRes.data?.length ?? 0,
    documentCount: documentsRes.count ?? 0,
  };
}
