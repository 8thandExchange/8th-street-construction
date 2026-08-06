import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionItemRow,
  ActionUpdateRow,
  AgendaItemRow,
  AttendeeRow,
  DecisionRow,
  MeetingRow,
  MeetingSeriesRow,
} from "./types";
import { OPEN_ACTION_STATUSES } from "./types";
import type { MinutesBundle } from "./minutes-format";

/**
 * Shared reads for the admin pages, the assistant tools, and the cron. They
 * take whichever Supabase client the caller already has (RLS-scoped on pages,
 * service role in cron) so there's one query shape per question.
 */

// The generated Database types don't include these tables until `npm run
// db:types` is re-run against the new migration, so reads go through a loose
// client here rather than fighting the type generation in every call site.
type Client = SupabaseClient<any, any, any>;

export async function getMeetingSeries(supabase: Client) {
  const { data } = await supabase
    .from("meeting_series")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as MeetingSeriesRow[];
}

export async function getSeriesBySlug(supabase: Client, slug: string) {
  const { data } = await supabase
    .from("meeting_series")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data ?? null) as MeetingSeriesRow | null;
}

export type MeetingListRow = MeetingRow & {
  series: { name: string; slug: string } | null;
  open_action_count: number;
  overdue_action_count: number;
};

export async function listMeetings(
  supabase: Client,
  options?: { limit?: number; seriesId?: string; projectId?: string }
): Promise<MeetingListRow[]> {
  let query = supabase
    .from("meetings")
    .select("*, series:meeting_series(name, slug)")
    .order("meeting_date", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.seriesId) query = query.eq("series_id", options.seriesId);
  if (options?.projectId) query = query.eq("project_id", options.projectId);

  const { data } = await query;
  const meetings = (data ?? []) as (MeetingRow & {
    series: { name: string; slug: string } | null;
  })[];

  if (!meetings.length) return [];

  const { data: actions } = await supabase
    .from("meeting_action_items")
    .select("meeting_id, status, due_date")
    .in(
      "meeting_id",
      meetings.map((m) => m.id)
    );

  const today = new Date().toISOString().slice(0, 10);
  const counts = new Map<string, { open: number; overdue: number }>();
  for (const a of (actions ?? []) as Pick<
    ActionItemRow,
    "meeting_id" | "status" | "due_date"
  >[]) {
    if (!a.meeting_id) continue;
    if (!OPEN_ACTION_STATUSES.includes(a.status)) continue;
    const entry = counts.get(a.meeting_id) ?? { open: 0, overdue: 0 };
    entry.open++;
    if (a.due_date && a.due_date < today) entry.overdue++;
    counts.set(a.meeting_id, entry);
  }

  return meetings.map((m) => ({
    ...m,
    open_action_count: counts.get(m.id)?.open ?? 0,
    overdue_action_count: counts.get(m.id)?.overdue ?? 0,
  }));
}

export type MeetingDetail = MinutesBundle & {
  series: MeetingSeriesRow | null;
  updatesByAction: Record<string, ActionUpdateRow[]>;
};

export async function getMeetingDetail(
  supabase: Client,
  meetingId: string
): Promise<MeetingDetail | null> {
  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return null;

  const [attendees, agendaItems, decisions, actionItems, series] = await Promise.all([
    supabase
      .from("meeting_attendees")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at"),
    supabase
      .from("meeting_agenda_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("position"),
    supabase
      .from("meeting_decisions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at"),
    supabase
      .from("meeting_action_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at"),
    (meeting as MeetingRow).series_id
      ? supabase
          .from("meeting_series")
          .select("*")
          .eq("id", (meeting as MeetingRow).series_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const actions = (actionItems.data ?? []) as ActionItemRow[];
  const updatesByAction: Record<string, ActionUpdateRow[]> = {};

  if (actions.length) {
    const { data: updates } = await supabase
      .from("meeting_action_updates")
      .select("*")
      .in(
        "action_item_id",
        actions.map((a) => a.id)
      )
      .order("created_at", { ascending: false });

    for (const u of (updates ?? []) as ActionUpdateRow[]) {
      (updatesByAction[u.action_item_id] ??= []).push(u);
    }
  }

  return {
    meeting: meeting as MeetingRow,
    attendees: (attendees.data ?? []) as AttendeeRow[],
    agendaItems: (agendaItems.data ?? []) as AgendaItemRow[],
    decisions: (decisions.data ?? []) as DecisionRow[],
    actionItems: actions,
    series: (series.data ?? null) as MeetingSeriesRow | null,
    updatesByAction,
  };
}

export type ActionItemWithContext = ActionItemRow & {
  meeting: { id: string; title: string; meeting_date: string } | null;
  project: { id: string; title: string } | null;
  latest_update: ActionUpdateRow | null;
};

export async function listActionItems(
  supabase: Client,
  options?: {
    status?: string[];
    ownerProfileId?: string;
    projectId?: string;
    meetingId?: string;
    overdueOnly?: boolean;
    limit?: number;
  }
): Promise<ActionItemWithContext[]> {
  let query = supabase
    .from("meeting_action_items")
    .select(
      "*, meeting:meetings(id, title, meeting_date), project:projects(id, title)"
    )
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(options?.limit ?? 200);

  if (options?.status?.length) query = query.in("status", options.status);
  if (options?.ownerProfileId) query = query.eq("owner_profile_id", options.ownerProfileId);
  if (options?.projectId) query = query.eq("project_id", options.projectId);
  if (options?.meetingId) query = query.eq("meeting_id", options.meetingId);
  if (options?.overdueOnly) {
    query = query
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .in("status", OPEN_ACTION_STATUSES);
  }

  const { data } = await query;
  const rows = (data ?? []) as ActionItemWithContext[];
  if (!rows.length) return [];

  const { data: updates } = await supabase
    .from("meeting_action_updates")
    .select("*")
    .in(
      "action_item_id",
      rows.map((r) => r.id)
    )
    .order("created_at", { ascending: false });

  const latest = new Map<string, ActionUpdateRow>();
  for (const u of (updates ?? []) as ActionUpdateRow[]) {
    if (!latest.has(u.action_item_id)) latest.set(u.action_item_id, u);
  }

  return rows.map((r) => ({ ...r, latest_update: latest.get(r.id) ?? null }));
}

export async function getActionItemUpdates(supabase: Client, actionItemId: string) {
  const { data } = await supabase
    .from("meeting_action_updates")
    .select("*")
    .eq("action_item_id", actionItemId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ActionUpdateRow[];
}
