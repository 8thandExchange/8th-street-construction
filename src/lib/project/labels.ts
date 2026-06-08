export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

export const MILESTONE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-stone-100 text-stone-500 border-stone-200",
  in_progress: "bg-copper/10 text-copper border-copper/30",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blocked: "bg-amber-50 text-amber-800 border-amber-200",
};

export const CHANGE_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_client: "Awaiting Client",
  approved: "Approved",
  rejected: "Rejected",
};

export const CHANGE_ORDER_STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500 border-stone-200",
  pending_client: "bg-violet-50 text-violet-700 border-violet-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pre_construction: "Pre-Construction",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  archived: "Archived",
};

export const PLAN_SET_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_client: "Awaiting Sign-Off",
  approved: "Signed Off",
  revision_requested: "Revisions Requested",
};

export const PLAN_SET_STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500 border-stone-200",
  pending_client: "bg-violet-50 text-violet-700 border-violet-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revision_requested: "bg-amber-50 text-amber-800 border-amber-200",
};

export const PLAN_FILE_KINDS = [
  { value: "plan", label: "Architectural Plan" },
  { value: "rendering", label: "Rendering" },
  { value: "elevation", label: "Elevation" },
  { value: "site_plan", label: "Site Plan" },
  { value: "other", label: "Other" },
] as const;

export const DOCUMENT_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "permit", label: "Permit" },
  { value: "plan", label: "Plan / Drawing" },
  { value: "invoice", label: "Invoice" },
  { value: "other", label: "Other" },
] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_STATUS_STYLES: Record<string, string> = {
  todo: "bg-stone-100 text-stone-500 border-stone-200",
  in_progress: "bg-copper/10 text-copper border-copper/30",
  blocked: "bg-amber-50 text-amber-800 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-stone-100 text-stone-400 border-stone-200",
};
