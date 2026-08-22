import { createClient } from "@/lib/supabase/server";
import { getComplianceDashboardAlerts } from "@/lib/compliance/compliance-reminders";
import { getPlaybookProgress } from "@/lib/build/apply-playbook";
import { getPlaybookById, DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";
import {
  buildCompanyBriefing,
  type CompanyBriefing,
} from "@/lib/operations/company-briefing";

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
  briefing: CompanyBriefing;
  attention: CompanyAttentionItem[];
};

export type CompanyAttentionItem = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
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

  const projectIds = (projects ?? []).map((project) => project.id);
  const [
    { data: tasks },
    { data: milestones },
    { data: draws },
    { data: invoices },
    { data: punchItems },
    { data: selections },
    { data: estimateLines },
    { data: vendorBills },
    { data: commitments },
    { data: rfis },
    { data: submittals },
  ] = await Promise.all([
    projectIds.length
      ? supabase
          .from("project_tasks")
          .select("id, project_id, title, status, due_date")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_milestones")
          .select("project_id, phase_key, status")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("payment_draws")
          .select("project_id, amount, status")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("invoices")
      .select("id, project_id, invoice_number, status, total, amount_paid, due_date"),
    projectIds.length
      ? supabase
          .from("punch_list_items")
          .select("project_id, status")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_selections")
          .select("project_id, status, due_date")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_estimate_lines")
          .select("id, project_id")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    supabase.from("vendor_bills").select("id, title, status, amount, due_date"),
    supabase
      .from("meeting_action_items")
      .select("id, title, status, priority, due_date, owner_name"),
    projectIds.length
      ? supabase
          .from("project_rfis")
          .select("id, project_id, title, status, schedule_impact")
          .in("project_id", projectIds)
          .in("status", ["open", "answered"])
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_submittals")
          .select("id, project_id, title, status")
          .in("project_id", projectIds)
          .in("status", ["submitted", "in_review"])
      : Promise.resolve({ data: [] }),
  ]);

  const briefing = buildCompanyBriefing({
    today,
    invoices: invoices ?? [],
    vendorBills: vendorBills ?? [],
    commitments: commitments ?? [],
    tasks: tasks ?? [],
  });

  const jobs: CompanyJobCard[] = [];

  for (const p of projects ?? []) {
    const projectTasks = (tasks ?? []).filter((item) => item.project_id === p.id);
    const projectMilestones = (milestones ?? []).filter((item) => item.project_id === p.id);
    const projectDraws = (draws ?? []).filter((item) => item.project_id === p.id);
    const projectInvoices = (invoices ?? []).filter((item) => item.project_id === p.id);
    const projectPunch = (punchItems ?? []).filter((item) => item.project_id === p.id);
    const projectSelections = (selections ?? []).filter((item) => item.project_id === p.id);
    const projectEstimateLines = (estimateLines ?? []).filter((item) => item.project_id === p.id);

    const tasksDone = projectTasks.filter((t) => t.status === "done").length;
    const tasksTotal = projectTasks.length;
    const progressPct = tasksTotal
      ? Math.round((tasksDone / tasksTotal) * 100)
      : p.playbook_applied_at
        ? Math.round(
            (projectMilestones.filter((m) => m.status === "completed").length /
              Math.max(1, projectMilestones.length)) *
              100
          )
        : 0;

    const paidToUs = projectDraws
      .filter((d) => d.status === "paid")
      .reduce((s, d) => s + Number(d.amount), 0);

    const unpaidInvoices = projectInvoices.filter(
      (i) => i.status !== "paid" && i.status !== "void"
    ).length;

    const selectionsOverdue = projectSelections.filter(
      (s) =>
        s.due_date &&
        s.due_date < today &&
        s.status !== "approved" &&
        s.status !== "installed"
    ).length;

    let alertCount = 0;
    if (!p.client_id) alertCount++;
    if (!Number(p.contract_value)) alertCount++;
    if (projectEstimateLines.length === 0) alertCount++;
    if (unpaidInvoices) alertCount++;
    if (selectionsOverdue) alertCount++;
    if ((rfis ?? []).some((r) => r.project_id === p.id)) alertCount++;
    if ((submittals ?? []).some((s) => s.project_id === p.id)) alertCount++;

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
      openPunch: projectPunch.filter((x) => x.status !== "complete").length,
      selectionsOverdue,
      hasCostPlan: projectEstimateLines.length > 0,
      hasClient: Boolean(p.client_id),
      alertCount,
    });
  }

  const attention: CompanyAttentionItem[] = [];
  if (briefing.receivables.overdueCount > 0) {
    attention.push({
      id: "overdue-receivables",
      severity: "critical",
      title: `${briefing.receivables.overdueCount} overdue client invoice${
        briefing.receivables.overdueCount === 1 ? "" : "s"
      }`,
      detail: "Collect or resolve the outstanding balance",
      href: "/admin/invoicing",
    });
  }
  if (briefing.payables.overdueCount > 0) {
    attention.push({
      id: "overdue-payables",
      severity: "critical",
      title: `${briefing.payables.overdueCount} vendor bill${
        briefing.payables.overdueCount === 1 ? "" : "s"
      } past due`,
      detail: "Review accounts payable",
      href: "/admin/vendors",
    });
  }
  if (briefing.commitments.overdueCount > 0 || briefing.commitments.blockedCount > 0) {
    attention.push({
      id: "meeting-commitments",
      severity: briefing.commitments.blockedCount > 0 ? "critical" : "warning",
      title: `${briefing.commitments.overdueCount} overdue · ${briefing.commitments.blockedCount} blocked commitment${
        briefing.commitments.blockedCount === 1 ? "" : "s"
      }`,
      detail: "Close the loop on meeting action items",
      href: "/admin/meetings/action-items",
    });
  }
  if (briefing.schedule.overdueTaskCount > 0) {
    attention.push({
      id: "overdue-tasks",
      severity: "warning",
      title: `${briefing.schedule.overdueTaskCount} checklist item${
        briefing.schedule.overdueTaskCount === 1 ? "" : "s"
      } past due`,
      detail: "Open a job to update the build plan",
      href: "/admin/projects",
    });
  }
  const openRfis = (rfis ?? []).filter((r) => r.status === "open");
  const pendingSubs = submittals ?? [];
  if (openRfis.length > 0) {
    attention.push({
      id: "open-rfis",
      severity: openRfis.some((r) => r.schedule_impact === "likely") ? "critical" : "warning",
      title: `${openRfis.length} open RFI${openRfis.length === 1 ? "" : "s"}`,
      detail: "A written answer is still outstanding",
      href: "/admin/projects",
    });
  }
  if (pendingSubs.length > 0) {
    attention.push({
      id: "pending-submittals",
      severity: "warning",
      title: `${pendingSubs.length} submittal${pendingSubs.length === 1 ? "" : "s"} awaiting a decision`,
      detail: "Approve, note, or reject before the field proceeds",
      href: "/admin/projects",
    });
  }
  for (const item of complianceAlerts.slice(0, 2)) {
    attention.push({
      id: `compliance-${item.id}`,
      severity: item.status === "expired" ? "critical" : "warning",
      title: item.title,
      detail: item.status === "expired" ? "Compliance record expired" : `${item.days} days remaining`,
      href: "/admin/compliance",
    });
  }

  return {
    jobs,
    complianceAlerts,
    newLeads: newLeads ?? 0,
    pendingConsults: pendingConsults ?? 0,
    briefing,
    attention,
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
