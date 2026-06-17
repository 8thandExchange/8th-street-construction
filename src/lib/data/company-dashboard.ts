import { createClient } from "@/lib/supabase/server";
import { getComplianceDashboardAlerts } from "@/lib/compliance/compliance-reminders";
import { getPlaybookProgress } from "@/lib/build/apply-playbook";
import { getPlaybookById, DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";

export type CompanyJobCard = {
  id: string;
  title: string;
  slug: string;
  status: string;
  location: string | null;
  progressPct: number;
  tasksDone: number;
  tasksTotal: number;
  estimatedCost: number;
  clientContract: number;
  paidToUs: number;
  unpaidInvoices: number;
  openPunch: number;
  selectionsOverdue: number;
  hasCostPlan: boolean;
  hasClient: boolean;
  alertCount: number;
};

export type CompanyDashboardData = {
  jobs: CompanyJobCard[];
  complianceAlerts: Awaited<ReturnType<typeof getComplianceDashboardAlerts>>;
  newLeads: number;
  pendingConsults: number;
};

export async function loadCompanyDashboard(): Promise<CompanyDashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: projects },
    complianceAlerts,
    { count: newLeads },
    { count: pendingConsults },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, slug, title, status, location, contract_value, estimated_cost, client_id, playbook_applied_at, playbook_id"
      )
      .in("status", ["pre_construction", "in_progress"])
      .order("updated_at", { ascending: false }),
    getComplianceDashboardAlerts(),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested"),
  ]);

  const jobs: CompanyJobCard[] = [];

  for (const p of projects ?? []) {
    const [
      tasksRes,
      milestonesRes,
      drawsRes,
      invoicesRes,
      punchRes,
      selectionsRes,
      estimateRes,
    ] = await Promise.all([
      supabase.from("project_tasks").select("status").eq("project_id", p.id),
      supabase.from("project_milestones").select("phase_key, status").eq("project_id", p.id),
      supabase.from("payment_draws").select("amount, status").eq("project_id", p.id),
      supabase.from("invoices").select("status").eq("project_id", p.id),
      supabase.from("punch_list_items").select("status").eq("project_id", p.id),
      supabase
        .from("project_selections")
        .select("status, due_date")
        .eq("project_id", p.id),
      supabase
        .from("project_estimate_lines")
        .select("id", { count: "exact", head: true })
        .eq("project_id", p.id),
    ]);

    const tasks = tasksRes.data ?? [];
    const tasksDone = tasks.filter((t) => t.status === "done").length;
    const tasksTotal = tasks.length;
    const progressPct = tasksTotal
      ? Math.round((tasksDone / tasksTotal) * 100)
      : p.playbook_applied_at
        ? Math.round(
            ((milestonesRes.data ?? []).filter((m) => m.status === "completed").length /
              Math.max(1, (milestonesRes.data ?? []).length)) *
              100
          )
        : 0;

    const paidToUs = (drawsRes.data ?? [])
      .filter((d) => d.status === "paid")
      .reduce((s, d) => s + Number(d.amount), 0);

    const unpaidInvoices = (invoicesRes.data ?? []).filter(
      (i) => i.status !== "paid" && i.status !== "void"
    ).length;

    const selectionsOverdue = (selectionsRes.data ?? []).filter(
      (s) =>
        s.due_date &&
        s.due_date < today &&
        s.status !== "approved" &&
        s.status !== "installed"
    ).length;

    let alertCount = 0;
    if (!p.client_id) alertCount++;
    if (!Number(p.contract_value)) alertCount++;
    if ((estimateRes.count ?? 0) === 0) alertCount++;
    if (unpaidInvoices) alertCount++;
    if (selectionsOverdue) alertCount++;

    jobs.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      location: p.location,
      progressPct,
      tasksDone,
      tasksTotal,
      estimatedCost: Number(p.estimated_cost ?? 0),
      clientContract: Number(p.contract_value ?? 0),
      paidToUs,
      unpaidInvoices,
      openPunch: (punchRes.data ?? []).filter((x) => x.status !== "complete").length,
      selectionsOverdue,
      hasCostPlan: (estimateRes.count ?? 0) > 0,
      hasClient: Boolean(p.client_id),
      alertCount,
    });
  }

  return {
    jobs,
    complianceAlerts,
    newLeads: newLeads ?? 0,
    pendingConsults: pendingConsults ?? 0,
  };
}

export async function loadJobMasterBoard(projectId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, slug, title, status, location, street_address, contract_value, estimated_cost, client_id, playbook_applied_at, playbook_id, start_date, target_completion_date"
    )
    .eq("id", projectId)
    .single();

  if (!project) return null;

  const [
    tasksRes,
    milestonesRes,
    drawsRes,
    invoicesRes,
    estimateLinesRes,
    bidsRes,
    punchRes,
    selectionsRes,
    dailyLogsRes,
    clientRes,
  ] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id, title, status, phase_key, priority, due_date")
      .eq("project_id", projectId)
      .order("display_order"),
    supabase
      .from("project_milestones")
      .select("id, title, phase_key, status, target_date")
      .eq("project_id", projectId)
      .order("display_order"),
    supabase
      .from("payment_draws")
      .select("id, draw_number, title, amount, status")
      .eq("project_id", projectId)
      .order("draw_number"),
    supabase
      .from("invoices")
      .select("id, status, total")
      .eq("project_id", projectId),
    supabase
      .from("project_estimate_lines")
      .select(
        "id, division_code, trade_label, description, estimated_amount, awarded_amount, bid_request_id"
      )
      .eq("project_id", projectId)
      .order("display_order"),
    supabase
      .from("bid_requests")
      .select("id, bids(amount, status)")
      .eq("project_id", projectId),
    supabase.from("punch_list_items").select("id, status").eq("project_id", projectId),
    supabase
      .from("project_selections")
      .select("id, status, due_date, title")
      .eq("project_id", projectId),
    supabase
      .from("project_daily_logs")
      .select("id, log_date, summary")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false })
      .limit(3),
    project.client_id
      ? supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", project.client_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const tasks = tasksRes.data ?? [];
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const tasksTotal = tasks.length;
  const progressPct = tasksTotal
    ? Math.round((tasksDone / tasksTotal) * 100)
    : 0;

  const playbook =
    getPlaybookById(project.playbook_id ?? DEFAULT_PLAYBOOK_ID) ??
    getPlaybookById(DEFAULT_PLAYBOOK_ID)!;

  const phaseProgress = project.playbook_applied_at
    ? getPlaybookProgress(milestonesRes.data ?? [], tasks, playbook)
    : [];

  const awardedBids = (bidsRes.data ?? []).flatMap((rfq) =>
    Array.isArray(rfq.bids) ? rfq.bids : rfq.bids ? [rfq.bids] : []
  )
    .filter((b) => b.status === "awarded")
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);

  const openTasks = tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .slice(0, 8);

  const paidToUs = (drawsRes.data ?? [])
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.amount), 0);

  const nextDraw = (drawsRes.data ?? []).find((d) => d.status === "scheduled");

  return {
    project,
    client: clientRes.data,
    progressPct,
    tasksDone,
    tasksTotal,
    phaseProgress,
    estimateLines: estimateLinesRes.data ?? [],
    awardedBids,
    paidToUs,
    unpaidInvoices: (invoicesRes.data ?? []).filter(
      (i) => i.status !== "paid" && i.status !== "void"
    ).length,
    openPunch: (punchRes.data ?? []).filter((p) => p.status !== "complete").length,
    selectionsOverdue: (selectionsRes.data ?? []).filter(
      (s) =>
        s.due_date &&
        s.due_date < today &&
        s.status !== "approved" &&
        s.status !== "installed"
    ).length,
    openTasks,
    draws: drawsRes.data ?? [],
    nextDraw,
    recentLogs: dailyLogsRes.data ?? [],
  };
}
