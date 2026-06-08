import { createClient } from "@/lib/supabase/server";
import { getPlaybookById, DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";
import type { HubAlert } from "@/components/hub/HubUI";

export type ProjectHubSummary = {
  milestoneTotal: number;
  milestoneCompleted: number;
  taskTotal: number;
  taskCompleted: number;
  playbookApplied: boolean;
  playbookId: string | null;
  updateCount: number;
  documentCount: number;
  messageCount: number;
  pendingChangeOrders: number;
  pendingPlanSignOffs: number;
  clientEmail: string | null;
  clientName: string | null;
  contractValue: number;
  changeOrderTotal: number;
  paidDraws: number;
  openPunchItems: number;
  selectionsPending: number;
  selectionsOverdue: number;
  unpaidInvoices: number;
  openBidRequests: number;
  alerts: HubAlert[];
  overallProgress: number;
  nextActions: { href: string; label: string; hint: string }[];
};

export function playbookLabel(playbookId: string | null) {
  const p = getPlaybookById(playbookId ?? DEFAULT_PLAYBOOK_ID);
  return p ? `${p.name} (${p.state})` : "—";
}

export async function loadProjectForHub(projectId: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, slug, title, subtitle, status, category, location, street_address, client_id, project_manager_id, start_date, target_completion_date, contract_value, hero_image_url, playbook_applied_at, playbook_id"
    )
    .eq("id", projectId)
    .single();

  if (!project) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [
    milestonesRes,
    updatesRes,
    documentsRes,
    messagesRes,
    changeOrdersRes,
    planSetsRes,
    tasksRes,
    clientRes,
    drawsRes,
    invoicesRes,
    punchRes,
    selectionsRes,
    bidsRes,
  ] = await Promise.all([
    supabase.from("project_milestones").select("id, status").eq("project_id", projectId),
    supabase.from("project_updates").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("project_documents").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("project_messages").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("change_orders").select("id, status, cost_impact").eq("project_id", projectId),
    supabase.from("project_plan_sets").select("id, status").eq("project_id", projectId),
    supabase.from("project_tasks").select("id, status").eq("project_id", projectId),
    project.client_id
      ? supabase.from("profiles").select("email, first_name, last_name").eq("id", project.client_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("payment_draws").select("amount, status").eq("project_id", projectId),
    supabase.from("invoices").select("id, status, total").eq("project_id", projectId),
    supabase.from("punch_list_items").select("id, status, due_date").eq("project_id", projectId),
    supabase.from("project_selections").select("id, status, due_date, title").eq("project_id", projectId),
    supabase.from("bid_requests").select("id, status").eq("project_id", projectId).eq("status", "open"),
  ]);

  const milestones = milestonesRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const changeOrders = changeOrdersRes.data ?? [];
  const planSets = planSetsRes.data ?? [];
  const draws = drawsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const punch = punchRes.data ?? [];
  const selections = selectionsRes.data ?? [];

  const contractValue = Number(project.contract_value ?? 0);
  const changeOrderTotal = changeOrders
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + Number(c.cost_impact ?? 0), 0);
  const paidDraws = draws
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.amount), 0);
  const openPunchItems = punch.filter((p) => p.status !== "complete").length;
  const selectionsPending = selections.filter((s) =>
    ["pending", "client_review"].includes(s.status)
  ).length;
  const selectionsOverdue = selections.filter(
    (s) => s.due_date && s.due_date < today && s.status !== "approved" && s.status !== "installed"
  ).length;
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void").length;

  const taskPct = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
    : 0;
  const milestonePct = milestones.length
    ? Math.round((milestones.filter((m) => m.status === "completed").length / milestones.length) * 100)
    : 0;
  const overallProgress = tasks.length ? taskPct : milestonePct;

  const base = `/admin/projects/${projectId}`;
  const alerts: HubAlert[] = [];
  const nextActions: ProjectHubSummary["nextActions"] = [];

  if (!project.playbook_applied_at) {
    alerts.push({
      id: "playbook",
      severity: "warning",
      title: "Build playbook not applied",
      detail: "Seed GA or SC checklists to run the proven job sequence.",
      href: `${base}/build`,
      actionLabel: "Apply playbook",
    });
    nextActions.push({
      href: `${base}/build`,
      label: "Apply state playbook",
      hint: "11 phases · 70+ checklist items",
    });
  }

  if (!project.client_id) {
    alerts.push({
      id: "client",
      severity: "info",
      title: "No client assigned",
      detail: "Link a portal user so they can see timeline, selections, and pay draws.",
      href: `${base}/overview`,
      actionLabel: "Assign client",
    });
  }

  if (contractValue > 0 && draws.length === 0) {
    nextActions.push({
      href: `${base}/billing`,
      label: "Set up draw schedule",
      hint: "One-click 5-draw template",
    });
  }

  if (selectionsOverdue > 0) {
    alerts.push({
      id: "selections",
      severity: "critical",
      title: `${selectionsOverdue} selection${selectionsOverdue > 1 ? "s" : ""} past due`,
      detail: "Finish selections to keep finishes on schedule.",
      href: `${base}/selections`,
      actionLabel: "Review",
    });
  }

  if (changeOrders.some((c) => c.status === "pending_client")) {
    alerts.push({
      id: "co",
      severity: "warning",
      title: "Change order awaiting client approval",
      href: `${base}/change-orders`,
      actionLabel: "View",
    });
  }

  if (planSets.some((p) => p.status === "pending_client")) {
    alerts.push({
      id: "plans",
      severity: "warning",
      title: "Plan set awaiting client sign-off",
      href: `${base}/plans`,
      actionLabel: "View plans",
    });
  }

  if (planSets.some((p) => p.status === "revision_requested")) {
    alerts.push({
      id: "plan-revision",
      severity: "critical",
      title: "Client requested plan revisions",
      href: `${base}/plans`,
      actionLabel: "Review",
    });
  }

  if (unpaidInvoices > 0) {
    alerts.push({
      id: "invoice",
      severity: "warning",
      title: `${unpaidInvoices} unpaid invoice${unpaidInvoices > 1 ? "s" : ""}`,
      href: `${base}/billing`,
      actionLabel: "Billing",
    });
  }

  if (openPunchItems > 0 && project.status !== "pre_construction") {
    nextActions.push({
      href: `${base}/punch-list`,
      label: "Close punch list items",
      hint: `${openPunchItems} open`,
    });
  }

  if (project.playbook_applied_at && taskPct < 100) {
    nextActions.push({
      href: `${base}/tasks`,
      label: "Work checklists",
      hint: `${taskPct}% complete`,
    });
  }

  const summary: ProjectHubSummary = {
    milestoneTotal: milestones.length,
    milestoneCompleted: milestones.filter((m) => m.status === "completed").length,
    taskTotal: tasks.length,
    taskCompleted: tasks.filter((t) => t.status === "done").length,
    playbookApplied: Boolean(project.playbook_applied_at),
    playbookId: project.playbook_id,
    updateCount: updatesRes.count ?? 0,
    documentCount: documentsRes.count ?? 0,
    messageCount: messagesRes.count ?? 0,
    pendingChangeOrders: changeOrders.filter((c) => c.status === "pending_client").length,
    pendingPlanSignOffs: planSets.filter((p) => p.status === "pending_client").length,
    clientEmail: clientRes.data?.email ?? null,
    clientName: clientRes.data
      ? [clientRes.data.first_name, clientRes.data.last_name].filter(Boolean).join(" ") ||
        clientRes.data.email
      : null,
    contractValue,
    changeOrderTotal,
    paidDraws,
    openPunchItems,
    selectionsPending,
    selectionsOverdue,
    unpaidInvoices,
    openBidRequests: bidsRes.data?.length ?? 0,
    alerts,
    overallProgress,
    nextActions: nextActions.slice(0, 4),
  };

  return { project, summary };
}
