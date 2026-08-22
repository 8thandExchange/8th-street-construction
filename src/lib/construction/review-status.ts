export const RFI_STATUSES = ["draft", "open", "answered", "closed", "void"] as const;
export type RfiStatus = (typeof RFI_STATUSES)[number];

export const SUBMITTAL_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "approved_as_noted",
  "rejected",
  "void",
] as const;
export type SubmittalStatus = (typeof SUBMITTAL_STATUSES)[number];

export const SCHEDULE_IMPACTS = ["none", "possible", "likely"] as const;
export type ScheduleImpact = (typeof SCHEDULE_IMPACTS)[number];

const RFI_TRANSITIONS: Record<RfiStatus, RfiStatus[]> = {
  draft: ["open", "void"],
  open: ["answered", "void"],
  answered: ["closed", "open"],
  closed: ["void"],
  void: [],
};

const SUBMITTAL_TRANSITIONS: Record<SubmittalStatus, SubmittalStatus[]> = {
  draft: ["submitted", "void"],
  submitted: ["in_review", "approved", "approved_as_noted", "rejected", "void"],
  in_review: ["approved", "approved_as_noted", "rejected"],
  approved: ["void"],
  approved_as_noted: ["void"],
  rejected: ["submitted", "void"],
  void: [],
};

export function canTransitionRfi(from: RfiStatus, to: RfiStatus): boolean {
  return RFI_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionSubmittal(from: SubmittalStatus, to: SubmittalStatus): boolean {
  return SUBMITTAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function rfiNeedsClient(status: RfiStatus): boolean {
  return status === "open";
}

export function submittalNeedsReview(status: SubmittalStatus): boolean {
  return status === "submitted" || status === "in_review";
}
