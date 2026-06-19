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

export const PROJECT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500 border-stone-200",
  pre_construction: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-copper/10 text-copper border-copper/30",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_hold: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-stone-100 text-stone-400 border-stone-200",
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
  { value: "sub_quote", label: "Sub Quote (scanned)" },
  { value: "other", label: "Other" },
] as const;

export const SELECTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  client_review: "Needs Your Choice",
  selected: "Selected",
  ordered: "Ordered",
  installed: "Installed",
  approved: "Approved",
};

export const SELECTION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-stone-100 text-stone-500 border-stone-200",
  client_review: "bg-copper/10 text-copper border-copper/30",
  selected: "bg-blue-50 text-blue-700 border-blue-200",
  ordered: "bg-violet-50 text-violet-700 border-violet-200",
  installed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

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

export const DRAW_STATUS_LABELS: Record<string, string> = {
  scheduled: "Not billed yet",
  invoiced: "Invoice sent",
  paid: "Paid",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

export const DRAW_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-stone-100 text-stone-600 border-stone-200",
  invoiced: "bg-amber-50 text-amber-900 border-amber-200",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
  skipped: "bg-stone-50 text-stone-400 border-stone-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — waiting on payment",
  viewed: "Client opened it",
  paid: "Paid in full",
  partial: "Partly paid",
  overdue: "Past due",
  void: "Cancelled",
};

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500 border-stone-200",
  sent: "bg-amber-50 text-amber-900 border-amber-200",
  viewed: "bg-violet-50 text-violet-800 border-violet-200",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
  partial: "bg-amber-50 text-amber-900 border-amber-200",
  overdue: "bg-red-50 text-red-800 border-red-200",
  void: "bg-stone-100 text-stone-400 border-stone-200",
};
