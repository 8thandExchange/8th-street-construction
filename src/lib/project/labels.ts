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

export const DOCUMENT_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "permit", label: "Permit" },
  { value: "plan", label: "Plan / Drawing" },
  { value: "invoice", label: "Invoice" },
  { value: "other", label: "Other" },
] as const;
