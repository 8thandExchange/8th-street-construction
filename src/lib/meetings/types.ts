export const MEETING_KINDS = ["board", "partner", "client", "internal", "site"] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];

export const MEETING_STATUSES = [
  "scheduled",
  "in_progress",
  "draft_minutes",
  "approved",
  "archived",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const ACTION_ITEM_STATUSES = [
  "open",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

export const OPEN_ACTION_STATUSES: ActionItemStatus[] = ["open", "in_progress", "blocked"];

export const MEETING_KIND_LABELS: Record<MeetingKind, string> = {
  board: "Board",
  partner: "Partner",
  client: "Client",
  internal: "Internal",
  site: "Site",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  draft_minutes: "Draft minutes",
  approved: "Approved",
  archived: "Archived",
};

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export const ATTENDEE_ROLES = [
  "chair",
  "secretary",
  "attendee",
  "guest",
  "apology",
] as const;
export type AttendeeRole = (typeof ATTENDEE_ROLES)[number];

export type AgendaTemplateItem = {
  number?: string | null;
  title: string;
};

export type DefaultAttendee = {
  name: string;
  email?: string | null;
  organization?: string | null;
  role?: AttendeeRole | string | null;
};

export type MeetingSeriesRow = {
  id: string;
  slug: string;
  name: string;
  kind: MeetingKind;
  cadence: string | null;
  partner_org: string | null;
  project_id: string | null;
  agenda_template: AgendaTemplateItem[];
  default_attendees: DefaultAttendee[];
  notes: string | null;
  is_active: boolean;
};

export type MeetingRow = {
  id: string;
  series_id: string | null;
  title: string;
  kind: MeetingKind;
  meeting_date: string;
  started_at: string | null;
  ended_at: string | null;
  location: string | null;
  project_id: string | null;
  status: MeetingStatus;
  purpose: string | null;
  summary: string | null;
  minutes_md: string | null;
  raw_notes: string | null;
  source_reference: string | null;
  next_meeting_date: string | null;
  prepared_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approved_snapshot: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendeeRow = {
  id: string;
  meeting_id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  organization: string | null;
  role: string;
  present: boolean;
};

export type AgendaItemRow = {
  id: string;
  meeting_id: string;
  position: number;
  number: string | null;
  title: string;
  notes_md: string | null;
  outcome: string | null;
  status: string;
  carried_from_item_id: string | null;
};

export type DecisionRow = {
  id: string;
  meeting_id: string;
  agenda_item_id: string | null;
  decision: string;
  rationale: string | null;
  moved_by: string | null;
  seconded_by: string | null;
};

export type ActionItemRow = {
  id: string;
  meeting_id: string | null;
  agenda_item_id: string | null;
  title: string;
  detail: string | null;
  owner_profile_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_org: string | null;
  is_external: boolean;
  due_date: string | null;
  status: ActionItemStatus;
  priority: string;
  project_id: string | null;
  project_task_id: string | null;
  source: string;
  nudge_enabled: boolean;
  last_nudge_at: string | null;
  nudge_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActionUpdateRow = {
  id: string;
  action_item_id: string;
  body: string;
  status_after: ActionItemStatus | null;
  author_profile_id: string | null;
  author_name: string | null;
  source: string;
  created_at: string;
};

/** Display name for whoever owns an action item, internal or external. */
export function ownerLabel(item: Pick<ActionItemRow, "owner_name" | "owner_email">) {
  return item.owner_name?.trim() || item.owner_email || "Unassigned";
}
