import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createActionItem,
  createMeeting,
  createMeetingMinutes,
  emailMinutes,
  pushActionItemToProject,
  recordActionUpdate,
  requestActionUpdates,
  type ActionItemInput,
  type AgendaItemInput,
  type AttendeeInput,
  type CreateMinutesInput,
  type DecisionInput,
} from "@/lib/actions/meetings";
import { getMeetingDetail, listActionItems, listMeetings } from "@/lib/meetings/queries";
import { formatDueDate, formatMeetingDate } from "@/lib/meetings/minutes-format";
import { OPEN_ACTION_STATUSES, ownerLabel, type ActionItemStatus } from "@/lib/meetings/types";

/**
 * The meeting half of the assistant's tool surface.
 *
 * Two jobs: turn loose notes (a pasted email, a typed recap, a transcript)
 * into the structured minutes record, and let the admin answer "where are we
 * at?" in one sentence without opening anything.
 */

export const MEETING_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_meetings",
    description:
      "List recent meetings with their date, status (draft minutes vs approved), and how many action items are still open or overdue. Use for 'what did we cover last week', 'do we have minutes for that', or before filing new minutes so you don't duplicate an existing meeting.",
    input_schema: {
      type: "object",
      properties: {
        series_slug: {
          type: "string",
          description: "Limit to one recurring meeting: 'board' or 'habitat-weekly'",
        },
        limit: { type: "integer", description: "Max meetings to return (default 15)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_meeting",
    description:
      "Get one meeting in full: attendees, numbered agenda with notes, decisions, and every action item with its id, owner, due date, status, and latest update. Call before answering questions about a meeting or updating any action item.",
    input_schema: {
      type: "object",
      properties: {
        meeting_id: { type: "string", description: "Meeting UUID from list_meetings" },
      },
      required: ["meeting_id"],
      additionalProperties: false,
    },
  },
  {
    name: "file_meeting_minutes",
    description:
      "File a complete set of minutes from notes, a pasted email, or a transcript. Creates the meeting record, attendees, numbered agenda with discussion notes, decisions, and action items in one pass. Extract EVERY action item stated in the source — including asides noted after the meeting. Set series_slug to 'board' for 8th Street board meetings or 'habitat-weekly' for the Habitat connect so the record joins the right run of meetings. Owners: use owner_email when you know it (Robby is robby@8thstreetconstruction.com) so the item can be chased automatically; leave is_external unset and it's inferred from whether the email matches a portal account.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "e.g. '8th Street / Habitat Weekly Connect'" },
        meeting_date: { type: "string", description: "YYYY-MM-DD, the date the meeting was held" },
        series_slug: {
          type: "string",
          enum: ["board", "habitat-weekly"],
          description: "The recurring meeting this belongs to, if any",
        },
        kind: {
          type: "string",
          enum: ["board", "partner", "client", "internal", "site"],
          description: "Defaults to the series kind",
        },
        location: { type: "string" },
        project_id: {
          type: "string",
          description: "Link the whole meeting to one job, when it was about a single job",
        },
        summary: {
          type: "string",
          description: "Two or three plain sentences: what this meeting settled",
        },
        source_reference: {
          type: "string",
          description:
            "Where the notes came from, for the audit trail — e.g. 'Email from McKenzie Beech, Aug 6 2026'",
        },
        raw_notes: {
          type: "string",
          description: "The original notes/email text, stored verbatim alongside the minutes",
        },
        next_meeting_date: { type: "string", description: "YYYY-MM-DD if one was set" },
        attendees: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              organization: { type: "string" },
              role: {
                type: "string",
                enum: ["chair", "secretary", "attendee", "guest", "apology"],
              },
              present: { type: "boolean" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
        agenda_items: {
          type: "array",
          description: "The numbered agenda, in order, with what was said under each heading",
          items: {
            type: "object",
            properties: {
              number: { type: "string", description: "e.g. '2' or '2.1'" },
              title: { type: "string" },
              notes_md: { type: "string", description: "Discussion notes (markdown bullets)" },
              outcome: { type: "string" },
              status: {
                type: "string",
                enum: ["open", "closed", "carried"],
                description: "'carried' or 'open' pulls it onto the next agenda as matters arising",
              },
            },
            required: ["title"],
            additionalProperties: false,
          },
        },
        decisions: {
          type: "array",
          description: "Things the meeting settled — the part that matters for the record",
          items: {
            type: "object",
            properties: {
              decision: { type: "string" },
              rationale: { type: "string" },
              agenda_item_number: { type: "string" },
            },
            required: ["decision"],
            additionalProperties: false,
          },
        },
        action_items: {
          type: "array",
          description: "Who owes what, by when. One entry per commitment made.",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "The commitment, as a doing-word phrase" },
              detail: { type: "string" },
              owner_name: { type: "string" },
              owner_email: { type: "string" },
              owner_org: { type: "string" },
              is_external: {
                type: "boolean",
                description: "True when the owner is outside 8th Street (they are never auto-emailed)",
              },
              due_date: { type: "string", description: "YYYY-MM-DD if one was stated or implied" },
              priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
              project_id: { type: "string", description: "Link to a job when the item is about one" },
              agenda_item_number: { type: "string" },
            },
            required: ["title"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "meeting_date"],
      additionalProperties: false,
    },
  },
  {
    name: "list_action_items",
    description:
      "List action items across all meetings — the running 'who owes what' list. Filter by status, whether they're overdue, a person, a job, or one meeting. Use for 'what's outstanding', 'what does Robby owe', 'what's overdue', or 'what came out of the Habitat meeting'.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "in_progress", "blocked", "done", "cancelled", "all_open"],
          description: "'all_open' covers open + in progress + blocked (the default)",
        },
        owner: {
          type: "string",
          description: "Name or email fragment of the owner, e.g. 'robby' or 'mckenzie'",
        },
        project_id: { type: "string" },
        meeting_id: { type: "string" },
        overdue_only: { type: "boolean" },
        limit: { type: "integer", description: "Default 50" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_action_item",
    description:
      "Record where an action item stands. ALWAYS pass update_note — the admin's own words about what happened; it's appended to the item's permanent trail and is what makes the record hold up later. Set status when it moved (done, in_progress, blocked) and due_date when a date got agreed. This is how the admin answers the daily 'where are we at?' digest.",
    input_schema: {
      type: "object",
      properties: {
        action_item_id: { type: "string", description: "UUID from list_action_items or get_meeting" },
        update_note: {
          type: "string",
          description: "What's happened, in the admin's words — e.g. 'Groundbreaking set for the week of the 24th'",
        },
        status: {
          type: "string",
          enum: ["open", "in_progress", "blocked", "done", "cancelled"],
        },
        due_date: { type: "string", description: "YYYY-MM-DD — set or change the due date" },
      },
      required: ["action_item_id", "update_note"],
      additionalProperties: false,
    },
  },
  {
    name: "create_action_item",
    description:
      "Add a standalone action item that didn't come out of a filed meeting (a hallway commitment, something off a phone call). For items from a meeting, use file_meeting_minutes instead.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        detail: { type: "string" },
        owner_name: { type: "string" },
        owner_email: { type: "string" },
        owner_org: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
        project_id: { type: "string" },
        meeting_id: { type: "string", description: "Attach to an existing meeting if it belongs to one" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "push_action_item_to_project",
    description:
      "Turn a meeting action item into a real task on a job's build board, linked both ways — closing one closes the other. Use when a commitment is actual site work ('volunteer dates for 605 Eve') so it shows up where the job is managed.",
    input_schema: {
      type: "object",
      properties: {
        action_item_id: { type: "string" },
        project_id: { type: "string", description: "Project UUID from list_projects" },
      },
      required: ["action_item_id", "project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "schedule_next_meeting",
    description:
      "Create the next meeting in a series with its agenda already built: the standing template, last meeting's unfinished business as matters arising, every still-open action item, and one progress-report line per active job. Returns the drafted agenda so it can be read out or emailed.",
    input_schema: {
      type: "object",
      properties: {
        series_slug: { type: "string", enum: ["board", "habitat-weekly"] },
        meeting_date: { type: "string", description: "YYYY-MM-DD" },
        title: { type: "string", description: "Defaults to the series name" },
        location: { type: "string" },
      },
      required: ["series_slug", "meeting_date"],
      additionalProperties: false,
    },
  },
  {
    name: "request_action_updates",
    description:
      "Email the 'where are we at?' digest now instead of waiting for the daily run. Each internal owner gets one email listing what they owe; items owned by outside parties appear in the admins' digest as 'waiting on' rather than emailing the outsider.",
    input_schema: {
      type: "object",
      properties: {
        meeting_id: {
          type: "string",
          description: "Limit the chase to one meeting's action items (optional)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "email_minutes",
    description:
      "Email the minutes of a meeting to everyone who attended. Sends the same text held on the record, so the copy in their inbox matches the copy on file.",
    input_schema: {
      type: "object",
      properties: {
        meeting_id: { type: "string" },
        note: { type: "string", description: "Optional line at the top, e.g. 'Corrections by Friday please.'" },
      },
      required: ["meeting_id"],
      additionalProperties: false,
    },
  },
];

export const MEETING_TOOL_NAMES = new Set(MEETING_TOOLS.map((t) => t.name));

/** Filing the record and anything that leaves the building gets an approval card. */
export function meetingToolRequiresConfirmation(name: string): boolean {
  return (
    name === "file_meeting_minutes" ||
    name === "request_action_updates" ||
    name === "email_minutes"
  );
}

export async function describeMeetingConfirmation(
  name: string,
  input: unknown
): Promise<string | null> {
  const i = input as Record<string, unknown>;

  if (name === "file_meeting_minutes") {
    const actions = (i.action_items as ActionItemInput[]) ?? [];
    const agenda = (i.agenda_items as AgendaItemInput[]) ?? [];
    const decisions = (i.decisions as DecisionInput[]) ?? [];
    const attendees = (i.attendees as AttendeeInput[]) ?? [];

    const actionLines = actions
      .map((a) => {
        const who = a.owner_name || a.owner_email || "Unassigned";
        const due = a.due_date ? ` — due ${formatDueDate(a.due_date)}` : "";
        return `• ${who} — ${a.title}${due}`;
      })
      .join("\n");

    const parts = [
      `File minutes for "${String(i.title)}" on ${formatMeetingDate(String(i.meeting_date))}.`,
      "",
      `${attendees.length} attendee${attendees.length === 1 ? "" : "s"} · ${agenda.length} agenda item${
        agenda.length === 1 ? "" : "s"
      } · ${decisions.length} decision${decisions.length === 1 ? "" : "s"} · ${
        actions.length
      } action item${actions.length === 1 ? "" : "s"}`,
    ];

    if (decisions.length) {
      parts.push("", "Decisions recorded:", ...decisions.map((d) => `• ${d.decision}`));
    }
    if (actionLines) parts.push("", "Action items:", actionLines);
    parts.push("", "Saved as draft minutes — nothing is emailed to anyone.");

    return parts.join("\n");
  }

  if (name === "request_action_updates") {
    return "Email the 'where are we at?' digest now — one email per internal owner listing what they owe. Outside parties are not emailed; their items show up in the admins' digest as 'waiting on'.";
  }

  if (name === "email_minutes") {
    const admin = createAdminClient();
    const meetingId = String(i.meeting_id ?? "");
    const { data: meeting } = await admin
      .from("meetings")
      .select("title, meeting_date, status")
      .eq("id", meetingId)
      .maybeSingle();
    const { data: attendees } = await admin
      .from("meeting_attendees")
      .select("name, email")
      .eq("meeting_id", meetingId);

    const to = (attendees ?? [])
      .filter((a) => a.email)
      .map((a) => `${a.name} <${a.email}>`)
      .join(", ");

    const state =
      meeting?.status === "approved" ? "approved minutes" : "DRAFT minutes (not yet approved)";

    return `Email the ${state} for "${meeting?.title ?? "this meeting"}"${
      meeting ? ` (${formatMeetingDate(meeting.meeting_date)})` : ""
    } to: ${to || "— no attendee email addresses on file"}`;
  }

  return null;
}

function actionSummary(a: {
  id: string;
  title: string;
  owner_name: string | null;
  owner_email: string | null;
  due_date: string | null;
  status: string;
  is_external: boolean;
  project?: { id: string; title: string } | null;
  meeting?: { id: string; title: string; meeting_date: string } | null;
  latest_update?: { body: string; created_at: string } | null;
  project_task_id?: string | null;
}) {
  return {
    id: a.id,
    title: a.title,
    owner: ownerLabel(a),
    owner_is_external: a.is_external,
    due_date: a.due_date,
    status: a.status,
    project: a.project ? { id: a.project.id, title: a.project.title } : null,
    on_project_board: Boolean(a.project_task_id),
    from_meeting: a.meeting
      ? { id: a.meeting.id, title: a.meeting.title, date: a.meeting.meeting_date }
      : null,
    latest_update: a.latest_update
      ? { note: a.latest_update.body, at: a.latest_update.created_at }
      : null,
  };
}

export async function executeMeetingTool(name: string, input: unknown): Promise<unknown> {
  const admin = createAdminClient();
  const i = (input ?? {}) as Record<string, unknown>;

  switch (name) {
    case "list_meetings": {
      let seriesId: string | undefined;
      if (i.series_slug) {
        const { data } = await admin
          .from("meeting_series")
          .select("id")
          .eq("slug", String(i.series_slug))
          .maybeSingle();
        seriesId = data?.id;
        if (!seriesId) return { error: `No meeting series named '${String(i.series_slug)}'` };
      }

      const meetings = await listMeetings(admin, {
        seriesId,
        limit: Number(i.limit ?? 15),
      });

      return meetings.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.meeting_date,
        kind: m.kind,
        status: m.status,
        series: m.series?.name ?? null,
        summary: m.summary,
        open_action_items: m.open_action_count,
        overdue_action_items: m.overdue_action_count,
      }));
    }

    case "get_meeting": {
      const detail = await getMeetingDetail(admin, String(i.meeting_id ?? ""));
      if (!detail) return { error: "Meeting not found" };

      return {
        id: detail.meeting.id,
        title: detail.meeting.title,
        date: detail.meeting.meeting_date,
        status: detail.meeting.status,
        approved_at: detail.meeting.approved_at,
        summary: detail.meeting.summary,
        source: detail.meeting.source_reference,
        attendees: detail.attendees.map((a) => ({
          name: a.name,
          organization: a.organization,
          role: a.role,
          present: a.present,
        })),
        agenda: detail.agendaItems.map((item) => ({
          number: item.number,
          title: item.title,
          notes: item.notes_md,
          outcome: item.outcome,
          status: item.status,
        })),
        decisions: detail.decisions.map((d) => d.decision),
        action_items: detail.actionItems.map((a) =>
          actionSummary({
            ...a,
            latest_update: detail.updatesByAction[a.id]?.[0] ?? null,
          })
        ),
        minutes_markdown: detail.meeting.approved_snapshot || detail.meeting.minutes_md,
      };
    }

    case "file_meeting_minutes": {
      const result = await createMeetingMinutes(i as unknown as CreateMinutesInput);
      return {
        ...result,
        note:
          result.unmatched_owners.length > 0
            ? `Filed as draft minutes. These owners have no portal account, so their items are tracked as 'waiting on' rather than chased by email: ${result.unmatched_owners.join(", ")}.`
            : "Filed as draft minutes. Confirm them at the next meeting to lock the record.",
      };
    }

    case "list_action_items": {
      const statusInput = String(i.status ?? "all_open");
      const status =
        statusInput === "all_open" ? OPEN_ACTION_STATUSES : [statusInput as ActionItemStatus];

      let ownerProfileId: string | undefined;
      const ownerQuery = i.owner ? String(i.owner).trim() : "";

      if (ownerQuery) {
        const { data } = await admin
          .from("profiles")
          .select("id, email, first_name, last_name")
          .or(
            `email.ilike.%${ownerQuery}%,first_name.ilike.%${ownerQuery}%,last_name.ilike.%${ownerQuery}%`
          )
          .limit(1);
        ownerProfileId = data?.[0]?.id;
      }

      const items = await listActionItems(admin, {
        status,
        projectId: i.project_id ? String(i.project_id) : undefined,
        meetingId: i.meeting_id ? String(i.meeting_id) : undefined,
        overdueOnly: Boolean(i.overdue_only),
        ownerProfileId,
        limit: Number(i.limit ?? 50),
      });

      // Owner search also has to catch external people, who have no profile.
      const filtered =
        ownerQuery && !ownerProfileId
          ? items.filter((a) =>
              `${a.owner_name ?? ""} ${a.owner_email ?? ""} ${a.owner_org ?? ""}`
                .toLowerCase()
                .includes(ownerQuery.toLowerCase())
            )
          : items;

      const today = new Date().toISOString().slice(0, 10);
      return {
        count: filtered.length,
        overdue: filtered.filter(
          (a) => a.due_date && a.due_date < today && OPEN_ACTION_STATUSES.includes(a.status)
        ).length,
        items: filtered.map(actionSummary),
      };
    }

    case "update_action_item": {
      const result = await recordActionUpdate({
        action_item_id: String(i.action_item_id ?? ""),
        body: String(i.update_note ?? ""),
        status: (i.status as ActionItemStatus | undefined) ?? null,
        ...(i.due_date !== undefined ? { due_date: String(i.due_date) } : {}),
        source: "assistant",
      });

      const { data: item } = await admin
        .from("meeting_action_items")
        .select("title, status, due_date, project_task_id")
        .eq("id", String(i.action_item_id ?? ""))
        .maybeSingle();

      return {
        recorded: true,
        title: item?.title,
        status: result.status,
        due_date: item?.due_date ?? null,
        project_task_synced: Boolean(item?.project_task_id),
      };
    }

    case "create_action_item": {
      const created = await createActionItem({
        title: String(i.title ?? ""),
        detail: i.detail ? String(i.detail) : null,
        meeting_id: i.meeting_id ? String(i.meeting_id) : null,
        owner_name: i.owner_name ? String(i.owner_name) : null,
        owner_email: i.owner_email ? String(i.owner_email) : null,
        owner_org: i.owner_org ? String(i.owner_org) : null,
        due_date: i.due_date ? String(i.due_date) : null,
        priority: i.priority ? String(i.priority) : null,
        project_id: i.project_id ? String(i.project_id) : null,
        source: "assistant",
      });
      return { created: true, ...created };
    }

    case "push_action_item_to_project": {
      const result = await pushActionItemToProject({
        action_item_id: String(i.action_item_id ?? ""),
        project_id: String(i.project_id ?? ""),
      });
      return result.already_linked
        ? { ...result, note: "This item was already on the job's board." }
        : { ...result, note: "Added to the job's build board and linked both ways." };
    }

    case "schedule_next_meeting": {
      const { data: series } = await admin
        .from("meeting_series")
        .select("id, name")
        .eq("slug", String(i.series_slug ?? ""))
        .maybeSingle();

      if (!series) return { error: `No meeting series named '${String(i.series_slug ?? "")}'` };

      const fd = new FormData();
      fd.set("series_id", series.id);
      fd.set("meeting_date", String(i.meeting_date ?? ""));
      if (i.title) fd.set("title", String(i.title));
      if (i.location) fd.set("location", String(i.location));

      const { id } = await createMeeting(fd);
      const detail = await getMeetingDetail(admin, id);

      return {
        meeting_id: id,
        title: detail?.meeting.title,
        date: detail?.meeting.meeting_date,
        agenda: (detail?.agendaItems ?? []).map((item) => ({
          number: item.number,
          title: item.title,
          notes: item.notes_md,
        })),
        note: "Agenda drafted from the standing template plus everything still outstanding. Edit it on the meeting page before circulating.",
      };
    }

    case "request_action_updates": {
      const result = await requestActionUpdates({
        meetingId: i.meeting_id ? String(i.meeting_id) : undefined,
      });
      return {
        ...result,
        note: result.digests
          ? `Sent ${result.digests} digest${result.digests === 1 ? "" : "s"}.`
          : "Nothing needed chasing — no item met the cooldown and due-date rules.",
      };
    }

    case "email_minutes": {
      const fd = new FormData();
      fd.set("id", String(i.meeting_id ?? ""));
      if (i.note) fd.set("note", String(i.note));
      return await emailMinutes(fd);
    }

    default:
      return { error: `Unknown meeting tool: ${name}` };
  }
}
