export const STAFF_SCOPES = ["full", "project_manager", "superintendent", "accounting"] as const;
export type StaffScope = (typeof STAFF_SCOPES)[number];

export const STAFF_SCOPE_LABELS: Record<StaffScope, string> = {
  full: "Full admin",
  project_manager: "Project manager",
  superintendent: "Superintendent",
  accounting: "Accounting",
};

export type StaffCapability =
  | "assistant"
  | "pipeline"
  | "money.read"
  | "money.write"
  | "field.write"
  | "company.settings"
  | "users.write"
  | "all_projects"
  | "create_project";

const CAPABILITIES: Record<StaffScope, readonly StaffCapability[]> = {
  full: [
    "assistant",
    "pipeline",
    "money.read",
    "money.write",
    "field.write",
    "company.settings",
    "users.write",
    "all_projects",
    "create_project",
  ],
  project_manager: ["pipeline", "money.read", "money.write", "field.write", "create_project"],
  superintendent: ["field.write"],
  accounting: ["money.read", "money.write", "all_projects"],
};

export function parseStaffScope(value: unknown): StaffScope {
  return STAFF_SCOPES.includes(value as StaffScope) ? (value as StaffScope) : "full";
}

export function staffHas(scope: StaffScope, capability: StaffCapability): boolean {
  return CAPABILITIES[scope].includes(capability);
}

export function staffCanOpenPath(scope: StaffScope, pathname: string): boolean {
  const path = pathname.split("?")[0] || "/admin";
  if (path === "/admin" || path === "/admin/") return true;
  if (path.startsWith("/admin/projects/new")) return staffHas(scope, "create_project");
  if (path.startsWith("/admin/projects")) return true;
  if (path.startsWith("/admin/assistant")) return staffHas(scope, "assistant");
  if (path.startsWith("/admin/leads") || path.startsWith("/admin/consultations")) {
    return staffHas(scope, "pipeline");
  }
  if (
    path.startsWith("/admin/invoicing") ||
    path.startsWith("/admin/vendors") ||
    path.startsWith("/admin/accounting") ||
    path.startsWith("/admin/job-costs") ||
    path.startsWith("/admin/contracts")
  ) {
    return staffHas(scope, "money.read");
  }
  if (
    path.startsWith("/admin/users") ||
    path.startsWith("/admin/settings") ||
    path.startsWith("/admin/testimonials") ||
    path.startsWith("/admin/base-plans")
  ) {
    return staffHas(scope, "company.settings") || staffHas(scope, "users.write");
  }
  if (
    path.startsWith("/admin/planning") ||
    path.startsWith("/admin/meetings") ||
    path.startsWith("/admin/compliance") ||
    path.startsWith("/admin/volunteer") ||
    path.startsWith("/admin/subcontractors")
  ) {
    return staffHas(scope, "field.write") || staffHas(scope, "company.settings");
  }
  return staffHas(scope, "company.settings");
}

export function staffCanSeeProject(
  scope: StaffScope,
  userId: string,
  project: { project_manager_id?: string | null; superintendent_id?: string | null }
): boolean {
  if (staffHas(scope, "all_projects")) return true;
  if (scope === "project_manager") return project.project_manager_id === userId;
  if (scope === "superintendent") return project.superintendent_id === userId;
  return false;
}

export function hubHrefsForScope(scope: StaffScope): string[] | null {
  if (scope === "full" || scope === "project_manager") return null;
  if (scope === "superintendent") {
    return [
      "",
      "/build",
      "/tasks",
      "/schedule",
      "/daily-logs",
      "/inspections",
      "/rfis",
      "/milestones",
      "/updates",
      "/plans",
      "/documents",
      "/messages",
      "/punch-list",
      "/service",
    ];
  }
  return ["", "/overview", "/costs", "/billing", "/change-orders", "/purchase-orders"];
}
