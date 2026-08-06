"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { CUSTOM_PHASE_KEY } from "@/lib/build/task-phases";
import { Resend } from "resend";
import { meetingMinutesEmail } from "@/lib/email/templates/meeting-minutes";
import { buildNextAgenda } from "@/lib/meetings/agenda";
import { renderMinutesMarkdown } from "@/lib/meetings/minutes-format";
import { getMeetingDetail } from "@/lib/meetings/queries";
import { runActionItemNudges } from "@/lib/meetings/nudges";
import {
  OPEN_ACTION_STATUSES,
  type ActionItemRow,
  type ActionItemStatus,
  type AgendaItemRow,
  type MeetingKind,
  type MeetingSeriesRow,
} from "@/lib/meetings/types";

/**
 * Every write into the meeting record. The admin pages call these directly as
 * form actions; the assistant's tools call the object-argument versions, so
 * "file these minutes" in chat and typing them into the page take the exact
 * same path through the database.
 */

function revalidateMeetings(meetingId?: string) {
  revalidatePath("/admin/meetings");
  revalidatePath("/admin/meetings/action-items");
  if (meetingId) revalidatePath(`/admin/meetings/${meetingId}`);
}

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const v = str(formData, key);
  return v || null;
}

// =====================================================================
// MEETINGS
// =====================================================================

export type AttendeeInput = {
  name: string;
  email?: string | null;
  organization?: string | null;
  role?: string | null;
  present?: boolean;
};

export type AgendaItemInput = {
  number?: string | null;
  title: string;
  notes_md?: string | null;
  outcome?: string | null;
  status?: "open" | "closed" | "carried";
};

export type DecisionInput = {
  decision: string;
  rationale?: string | null;
  agenda_item_number?: string | null;
};

export type ActionItemInput = {
  title: string;
  detail?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_org?: string | null;
  is_external?: boolean;
  due_date?: string | null;
  priority?: string | null;
  project_id?: string | null;
  agenda_item_number?: string | null;
};

export type CreateMinutesInput = {
  title: string;
  meeting_date: string;
  kind?: MeetingKind;
  series_slug?: string | null;
  location?: string | null;
  project_id?: string | null;
  summary?: string | null;
  raw_notes?: string | null;
  source_reference?: string | null;
  next_meeting_date?: string | null;
  attendees?: AttendeeInput[];
  agenda_items?: AgendaItemInput[];
  decisions?: DecisionInput[];
  action_items?: ActionItemInput[];
};

export type CreateMinutesResult = {
  meeting_id: string;
  title: string;
  meeting_date: string;
  agenda_item_count: number;
  decision_count: number;
  action_item_count: number;
  action_items: { id: string; title: string; owner: string; due_date: string | null }[];
  unmatched_owners: string[];
};

/**
 * Files a complete set of minutes in one transaction-ish pass. This is what
 * turns a pasted email or a typed-up set of notes into the structured record.
 */
export async function createMeetingMinutes(
  input: CreateMinutesInput
): Promise<CreateMinutesResult> {
  const { supabase, user } = await requireAdmin();

  if (!input.title?.trim()) throw new Error("Meeting title is required");
  if (!input.meeting_date) throw new Error("Meeting date is required");

  let series: MeetingSeriesRow | null = null;
  if (input.series_slug) {
    const { data } = await supabase
      .from("meeting_series")
      .select("*")
      .eq("slug", input.series_slug)
      .maybeSingle();
    series = (data ?? null) as MeetingSeriesRow | null;
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      series_id: series?.id ?? null,
      title: input.title.trim(),
      kind: input.kind ?? series?.kind ?? "internal",
      meeting_date: input.meeting_date,
      location: input.location ?? null,
      project_id: input.project_id ?? series?.project_id ?? null,
      status: "draft_minutes",
      summary: input.summary ?? null,
      raw_notes: input.raw_notes ?? null,
      source_reference: input.source_reference ?? null,
      next_meeting_date: input.next_meeting_date ?? null,
      prepared_by: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !meeting) throw new Error(error?.message || "Could not create the meeting");
  const meetingId = meeting.id as string;

  // Resolve people to portal accounts by email so ownership and nudges work.
  const emails = [
    ...(input.attendees ?? []).map((a) => a.email),
    ...(input.action_items ?? []).map((a) => a.owner_email),
  ].filter((e): e is string => Boolean(e));

  const profileByEmail = new Map<
    string,
    { id: string; name: string; isCompany: boolean }
  >();
  if (emails.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role")
      .in("email", [...new Set(emails.map((e) => e.toLowerCase()))]);
    for (const p of profiles ?? []) {
      if (!p.email) continue;
      profileByEmail.set(p.email.toLowerCase(), {
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
        // A Habitat contact may well hold a client portal login. Having an
        // account doesn't make them ours to chase — only admins are internal.
        isCompany: p.role === "admin",
      });
    }
  }

  if (input.attendees?.length) {
    await supabase.from("meeting_attendees").insert(
      input.attendees.map((a) => ({
        meeting_id: meetingId,
        profile_id: a.email ? (profileByEmail.get(a.email.toLowerCase())?.id ?? null) : null,
        name: a.name,
        email: a.email ?? null,
        organization: a.organization ?? null,
        role: a.role ?? "attendee",
        present: a.present ?? true,
      }))
    );
  }

  const agendaIdByNumber = new Map<string, string>();
  if (input.agenda_items?.length) {
    const { data: inserted } = await supabase
      .from("meeting_agenda_items")
      .insert(
        input.agenda_items.map((item, i) => ({
          meeting_id: meetingId,
          position: i,
          number: item.number ?? String(i + 1),
          title: item.title,
          notes_md: item.notes_md ?? null,
          outcome: item.outcome ?? null,
          status: item.status ?? "closed",
        }))
      )
      .select("id, number");

    for (const row of inserted ?? []) {
      if (row.number) agendaIdByNumber.set(String(row.number), row.id as string);
    }
  }

  if (input.decisions?.length) {
    await supabase.from("meeting_decisions").insert(
      input.decisions.map((d) => ({
        meeting_id: meetingId,
        agenda_item_id: d.agenda_item_number
          ? (agendaIdByNumber.get(d.agenda_item_number) ?? null)
          : null,
        decision: d.decision,
        rationale: d.rationale ?? null,
      }))
    );
  }

  const createdActions: CreateMinutesResult["action_items"] = [];
  const unmatchedOwners: string[] = [];

  if (input.action_items?.length) {
    const payload = input.action_items.map((a) => {
      const match = a.owner_email ? profileByEmail.get(a.owner_email.toLowerCase()) : undefined;
      const external = a.is_external ?? !match?.isCompany;
      if (external && a.owner_name) unmatchedOwners.push(a.owner_name);

      return {
        meeting_id: meetingId,
        agenda_item_id: a.agenda_item_number
          ? (agendaIdByNumber.get(a.agenda_item_number) ?? null)
          : null,
        title: a.title,
        detail: a.detail ?? null,
        owner_profile_id: match?.id ?? null,
        owner_name: a.owner_name ?? null,
        owner_email: a.owner_email ?? null,
        owner_org: a.owner_org ?? null,
        is_external: external,
        due_date: a.due_date ?? null,
        priority: a.priority ?? "normal",
        project_id: a.project_id ?? null,
        source: "meeting" as const,
        created_by: user.id,
      };
    });

    const { data: inserted, error: actionError } = await supabase
      .from("meeting_action_items")
      .insert(payload)
      .select("id, title, owner_name, owner_email, due_date");

    if (actionError) throw new Error(actionError.message);

    for (const row of inserted ?? []) {
      createdActions.push({
        id: row.id as string,
        title: row.title as string,
        owner: (row.owner_name as string) || (row.owner_email as string) || "Unassigned",
        due_date: (row.due_date as string) ?? null,
      });
    }
  }

  await regenerateMinutesText(meetingId);
  revalidateMeetings(meetingId);

  return {
    meeting_id: meetingId,
    title: input.title,
    meeting_date: input.meeting_date,
    agenda_item_count: input.agenda_items?.length ?? 0,
    decision_count: input.decisions?.length ?? 0,
    action_item_count: createdActions.length,
    action_items: createdActions,
    unmatched_owners: [...new Set(unmatchedOwners)],
  };
}

/** Rebuilds minutes_md from the structured record. Safe to call repeatedly. */
export async function regenerateMinutesText(meetingId: string) {
  const { supabase } = await requireAdmin();
  const detail = await getMeetingDetail(supabase, meetingId);
  if (!detail) throw new Error("Meeting not found");
  if (detail.meeting.status === "approved") return detail.meeting.approved_snapshot ?? "";

  const markdown = renderMinutesMarkdown(detail);
  await supabase.from("meetings").update({ minutes_md: markdown }).eq("id", meetingId);
  revalidateMeetings(meetingId);
  return markdown;
}

export async function createMeeting(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const seriesId = optional(formData, "series_id");

  let series: MeetingSeriesRow | null = null;
  if (seriesId) {
    const { data } = await supabase
      .from("meeting_series")
      .select("*")
      .eq("id", seriesId)
      .maybeSingle();
    series = (data ?? null) as MeetingSeriesRow | null;
  }

  const title = str(formData, "title") || series?.name || "Meeting";
  const meetingDate = str(formData, "meeting_date");
  if (!meetingDate) throw new Error("Meeting date is required");

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      series_id: series?.id ?? null,
      title,
      kind: (optional(formData, "kind") as MeetingKind | null) ?? series?.kind ?? "internal",
      meeting_date: meetingDate,
      location: optional(formData, "location"),
      project_id: optional(formData, "project_id") ?? series?.project_id ?? null,
      status: "scheduled",
      purpose: optional(formData, "purpose"),
      prepared_by: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !meeting) throw new Error(error?.message || "Could not create the meeting");

  if (series) {
    await seedAgendaFromSeries(meeting.id as string, series);
    if (series.default_attendees?.length) {
      await supabase.from("meeting_attendees").insert(
        series.default_attendees.map((a) => ({
          meeting_id: meeting.id,
          name: a.name,
          email: a.email ?? null,
          organization: a.organization ?? null,
          role: a.role ?? "attendee",
        }))
      );
    }
  }

  revalidateMeetings(meeting.id as string);
  return { id: meeting.id as string };
}

/**
 * Seeds a new meeting's agenda from its series: template skeleton, plus
 * everything left hanging from last time. This is the "meeting efficiency"
 * half — nobody rebuilds the agenda from memory.
 */
async function seedAgendaFromSeries(meetingId: string, series: MeetingSeriesRow) {
  const { supabase } = await requireAdmin();

  const { data: previous } = await supabase
    .from("meetings")
    .select("id, meeting_date, status")
    .eq("series_id", series.id)
    .neq("id", meetingId)
    .order("meeting_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let carriedItems: AgendaItemRow[] = [];
  if (previous) {
    const { data } = await supabase
      .from("meeting_agenda_items")
      .select("*")
      .eq("meeting_id", previous.id)
      .in("status", ["open", "carried"]);
    carriedItems = (data ?? []) as AgendaItemRow[];
  }

  const { data: openActions } = await supabase
    .from("meeting_action_items")
    .select("*")
    .in("status", OPEN_ACTION_STATUSES);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .in("status", ["pre_construction", "in_progress"])
    .order("title");

  const draft = buildNextAgenda({
    template: series.agenda_template ?? [],
    carriedItems,
    openActions: (openActions ?? []) as ActionItemRow[],
    projects: (projects ?? []) as { id: string; title: string }[],
    previousMeeting: previous ?? null,
  });

  if (!draft.length) return;

  await supabase.from("meeting_agenda_items").insert(
    draft.map((item, i) => ({
      meeting_id: meetingId,
      position: i,
      number: item.number,
      title: item.title,
      notes_md: item.notes_md,
      status: "open",
    }))
  );
}

export async function updateMeetingBasics(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");

  const { error } = await supabase
    .from("meetings")
    .update({
      title: str(formData, "title"),
      meeting_date: str(formData, "meeting_date"),
      location: optional(formData, "location"),
      status: optional(formData, "status") ?? undefined,
      summary: optional(formData, "summary"),
      next_meeting_date: optional(formData, "next_meeting_date"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  await regenerateMinutesText(id);
}

export async function deleteMeeting(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const { data: meeting } = await supabase
    .from("meetings")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (meeting?.status === "approved") {
    throw new Error("Approved minutes can't be deleted — archive them instead.");
  }

  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateMeetings();
}

// =====================================================================
// AGENDA / DECISIONS
// =====================================================================

export async function saveAgendaItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const meetingId = str(formData, "meeting_id");
  const id = optional(formData, "id");

  const payload = {
    number: optional(formData, "number"),
    title: str(formData, "title"),
    notes_md: optional(formData, "notes_md"),
    outcome: optional(formData, "outcome"),
    status: optional(formData, "status") ?? "closed",
  };

  if (!payload.title) throw new Error("Agenda item needs a title");

  if (id) {
    const { error } = await supabase.from("meeting_agenda_items").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: last } = await supabase
      .from("meeting_agenda_items")
      .select("position")
      .eq("meeting_id", meetingId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("meeting_agenda_items").insert({
      ...payload,
      meeting_id: meetingId,
      position: (last?.position ?? -1) + 1,
    });
    if (error) throw new Error(error.message);
  }

  await regenerateMinutesText(meetingId);
}

export async function deleteAgendaItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const meetingId = str(formData, "meeting_id");
  const { error } = await supabase
    .from("meeting_agenda_items")
    .delete()
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  await regenerateMinutesText(meetingId);
}

export async function addDecision(formData: FormData) {
  const { supabase } = await requireAdmin();
  const meetingId = str(formData, "meeting_id");
  const decision = str(formData, "decision");
  if (!decision) throw new Error("Write the decision out in full");

  const { error } = await supabase.from("meeting_decisions").insert({
    meeting_id: meetingId,
    agenda_item_id: optional(formData, "agenda_item_id"),
    decision,
    rationale: optional(formData, "rationale"),
    moved_by: optional(formData, "moved_by"),
    seconded_by: optional(formData, "seconded_by"),
  });

  if (error) throw new Error(error.message);
  await regenerateMinutesText(meetingId);
}

export async function deleteDecision(formData: FormData) {
  const { supabase } = await requireAdmin();
  const meetingId = str(formData, "meeting_id");
  const { error } = await supabase
    .from("meeting_decisions")
    .delete()
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  await regenerateMinutesText(meetingId);
}

// =====================================================================
// APPROVAL — the compliance gate
// =====================================================================

export async function approveMinutes(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const meetingId = str(formData, "id");

  const detail = await getMeetingDetail(supabase, meetingId);
  if (!detail) throw new Error("Meeting not found");
  if (detail.meeting.status === "approved") return;

  const snapshot = renderMinutesMarkdown(detail);

  const { error } = await supabase
    .from("meetings")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approved_snapshot: snapshot,
      minutes_md: snapshot,
    })
    .eq("id", meetingId);

  if (error) throw new Error(error.message);
  revalidateMeetings(meetingId);
}

export async function reopenMinutes(formData: FormData) {
  const { supabase } = await requireAdmin();
  const meetingId = str(formData, "id");
  const reason = str(formData, "reason");
  if (!reason) throw new Error("Give a reason for reopening approved minutes");

  const { error } = await supabase
    .from("meetings")
    .update({ status: "draft_minutes", reopen_reason: reason })
    .eq("id", meetingId);

  if (error) throw new Error(error.message);
  revalidateMeetings(meetingId);
}

export async function emailMinutes(formData: FormData) {
  const { supabase } = await requireAdmin();
  const meetingId = str(formData, "id");
  const note = optional(formData, "note");

  const detail = await getMeetingDetail(supabase, meetingId);
  if (!detail) throw new Error("Meeting not found");

  const recipients = [
    ...new Set(
      detail.attendees
        .map((a) => a.email?.trim())
        .filter((e): e is string => Boolean(e))
    ),
  ];

  if (!recipients.length) throw new Error("No attendee email addresses on this meeting");

  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email isn't configured (RESEND_API_KEY missing)");

  const { subject, html, text } = meetingMinutesEmail(detail, { note: note ?? undefined });
  const from =
    process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";

  await new Resend(key).emails.send({ from, to: recipients, subject, html, text });
  return { sent_to: recipients };
}

// =====================================================================
// ACTION ITEMS
// =====================================================================

export async function createActionItem(input: {
  title: string;
  detail?: string | null;
  meeting_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_org?: string | null;
  due_date?: string | null;
  priority?: string | null;
  project_id?: string | null;
  source?: "meeting" | "email" | "assistant" | "manual";
}) {
  const { supabase, user } = await requireAdmin();
  if (!input.title?.trim()) throw new Error("Action item needs a title");

  let ownerProfileId: string | null = null;
  let ownerIsCompany = false;
  if (input.owner_email) {
    const { data } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", input.owner_email.toLowerCase())
      .maybeSingle();
    ownerProfileId = data?.id ?? null;
    ownerIsCompany = data?.role === "admin";
  }

  const { data, error } = await supabase
    .from("meeting_action_items")
    .insert({
      meeting_id: input.meeting_id ?? null,
      title: input.title.trim(),
      detail: input.detail ?? null,
      owner_profile_id: ownerProfileId,
      owner_name: input.owner_name ?? null,
      owner_email: input.owner_email ?? null,
      owner_org: input.owner_org ?? null,
      is_external: !ownerIsCompany && Boolean(input.owner_name || input.owner_email),
      due_date: input.due_date ?? null,
      priority: input.priority ?? "normal",
      project_id: input.project_id ?? null,
      source: input.source ?? "manual",
      created_by: user.id,
    })
    .select("id, title, due_date, owner_name")
    .single();

  if (error) throw new Error(error.message);
  revalidateMeetings(input.meeting_id ?? undefined);
  return data as { id: string; title: string; due_date: string | null; owner_name: string | null };
}

export async function addActionItemForm(formData: FormData) {
  await createActionItem({
    title: str(formData, "title"),
    detail: optional(formData, "detail"),
    meeting_id: optional(formData, "meeting_id"),
    owner_name: optional(formData, "owner_name"),
    owner_email: optional(formData, "owner_email"),
    owner_org: optional(formData, "owner_org"),
    due_date: optional(formData, "due_date"),
    priority: optional(formData, "priority"),
    project_id: optional(formData, "project_id"),
    source: "manual",
  });
}

/**
 * The heart of the loop: a status change always carries a note, and the note
 * is appended forever. "Done" without a word about what happened is how
 * accountability quietly disappears.
 */
export async function recordActionUpdate(input: {
  action_item_id: string;
  body: string;
  status?: ActionItemStatus | null;
  due_date?: string | null;
  source?: "admin" | "assistant" | "email" | "nudge_reply";
}) {
  const { supabase, user } = await requireAdmin();

  const { data: item } = await supabase
    .from("meeting_action_items")
    .select("*")
    .eq("id", input.action_item_id)
    .maybeSingle();

  if (!item) throw new Error("Action item not found");
  const current = item as ActionItemRow;

  const nextStatus = input.status ?? current.status;
  const patch: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (input.due_date !== undefined) patch.due_date = input.due_date;
  patch.completed_at = nextStatus === "done" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("meeting_action_items")
    .update(patch)
    .eq("id", input.action_item_id);
  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (input.body?.trim()) {
    await supabase.from("meeting_action_updates").insert({
      action_item_id: input.action_item_id,
      body: input.body.trim(),
      status_after: nextStatus,
      author_profile_id: user.id,
      author_name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        profile?.email ||
        null,
      source: input.source ?? "admin",
    });
  }

  // Keep a linked project task in step so the job board doesn't lie.
  if (current.project_task_id) {
    const taskStatus =
      nextStatus === "done"
        ? "done"
        : nextStatus === "cancelled"
          ? "cancelled"
          : nextStatus === "blocked"
            ? "blocked"
            : nextStatus === "in_progress"
              ? "in_progress"
              : "todo";

    await supabase
      .from("project_tasks")
      .update({
        status: taskStatus,
        completed_at: nextStatus === "done" ? new Date().toISOString() : null,
        ...(input.due_date !== undefined ? { due_date: input.due_date } : {}),
      })
      .eq("id", current.project_task_id);

    if (current.project_id) revalidatePath(`/admin/projects/${current.project_id}`);
  }

  revalidateMeetings(current.meeting_id ?? undefined);
  return { status: nextStatus };
}

export async function postActionUpdateForm(formData: FormData) {
  const status = optional(formData, "status");
  await recordActionUpdate({
    action_item_id: str(formData, "action_item_id"),
    body: str(formData, "body"),
    status: (status as ActionItemStatus | null) ?? null,
    ...(formData.has("due_date") ? { due_date: optional(formData, "due_date") } : {}),
  });
}

export async function setActionItemStatusForm(formData: FormData) {
  await recordActionUpdate({
    action_item_id: str(formData, "action_item_id"),
    body: str(formData, "body") || `Status set to ${str(formData, "status")}.`,
    status: str(formData, "status") as ActionItemStatus,
  });
}

export async function updateActionItemDetails(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");

  const ownerEmail = optional(formData, "owner_email");
  let ownerProfileId: string | null = null;
  let ownerIsCompany = false;
  if (ownerEmail) {
    const { data } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", ownerEmail.toLowerCase())
      .maybeSingle();
    ownerProfileId = data?.id ?? null;
    ownerIsCompany = data?.role === "admin";
  }

  const { error } = await supabase
    .from("meeting_action_items")
    .update({
      title: str(formData, "title"),
      detail: optional(formData, "detail"),
      owner_name: optional(formData, "owner_name"),
      owner_email: ownerEmail,
      owner_org: optional(formData, "owner_org"),
      owner_profile_id: ownerProfileId,
      is_external: !ownerIsCompany && Boolean(optional(formData, "owner_name") || ownerEmail),
      due_date: optional(formData, "due_date"),
      priority: optional(formData, "priority") ?? "normal",
      project_id: optional(formData, "project_id"),
      nudge_enabled: formData.get("nudge_enabled") !== null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateMeetings(optional(formData, "meeting_id") ?? undefined);
}

export async function deleteActionItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("meeting_action_items")
    .delete()
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateMeetings(optional(formData, "meeting_id") ?? undefined);
}

/**
 * Pushes an action item onto a job as a real task, and keeps the two linked
 * so closing either one closes both. This is the "it builds into the client
 * project" step — a commitment made in a meeting becomes work on the board.
 */
export async function pushActionItemToProject(input: {
  action_item_id: string;
  project_id: string;
}) {
  const { supabase, user } = await requireAdmin();

  const { data: item } = await supabase
    .from("meeting_action_items")
    .select("*")
    .eq("id", input.action_item_id)
    .maybeSingle();

  if (!item) throw new Error("Action item not found");
  const action = item as ActionItemRow;

  if (action.project_task_id) {
    return { project_task_id: action.project_task_id, already_linked: true };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", input.project_id)
    .maybeSingle();
  if (!project) throw new Error("Project not found");

  const { data: meeting } = action.meeting_id
    ? await supabase
        .from("meetings")
        .select("title, meeting_date")
        .eq("id", action.meeting_id)
        .maybeSingle()
    : { data: null };

  const { data: last } = await supabase
    .from("project_tasks")
    .select("display_order")
    .eq("project_id", input.project_id)
    .eq("phase_key", CUSTOM_PHASE_KEY)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const provenance = meeting
    ? `From ${meeting.title} — ${meeting.meeting_date}.`
    : "From a meeting action item.";

  const { data: task, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: input.project_id,
      phase_key: CUSTOM_PHASE_KEY,
      title: action.title,
      description: [action.detail, provenance].filter(Boolean).join("\n\n"),
      status: action.status === "done" ? "done" : "todo",
      priority: action.priority,
      due_date: action.due_date,
      assignee_id: action.owner_profile_id,
      display_order: (last?.display_order ?? -1) + 1,
      is_custom: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) throw new Error(error?.message || "Could not create the task");

  await supabase
    .from("meeting_action_items")
    .update({ project_id: input.project_id, project_task_id: task.id })
    .eq("id", input.action_item_id);

  revalidatePath(`/admin/projects/${input.project_id}`);
  revalidatePath(`/admin/projects/${input.project_id}/tasks`);
  revalidateMeetings(action.meeting_id ?? undefined);

  return {
    project_task_id: task.id as string,
    project_title: project.title as string,
    already_linked: false,
  };
}

export async function pushActionItemToProjectForm(formData: FormData) {
  await pushActionItemToProject({
    action_item_id: str(formData, "action_item_id"),
    project_id: str(formData, "project_id"),
  });
}

// =====================================================================
// NUDGES
// =====================================================================

export async function requestActionUpdates(options?: { meetingId?: string }) {
  await requireAdmin();
  const result = await runActionItemNudges({ meetingId: options?.meetingId });
  revalidateMeetings();
  return result;
}

export async function requestActionUpdatesForm(formData: FormData) {
  await requestActionUpdates({ meetingId: optional(formData, "meeting_id") ?? undefined });
}
