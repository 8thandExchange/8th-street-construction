import type {
  ActionItemRow,
  AgendaItemRow,
  AgendaTemplateItem,
  MeetingRow,
} from "./types";
import { OPEN_ACTION_STATUSES, ownerLabel } from "./types";
import { daysUntilDue } from "./minutes-format";

/**
 * Agenda building for the next sitting.
 *
 * The whole point of "Matters Arising" on Robby's standing agenda is that
 * nothing quietly falls off the table. So the next agenda is assembled, not
 * retyped: the series template gives the skeleton, last meeting's unfinished
 * business and every still-open action item get folded in as sub-lines, and
 * live jobs fill the Progress Reports section.
 *
 * These are pure functions — the DB reads happen in the caller.
 */

export type DraftAgendaItem = {
  number: string;
  title: string;
  notes_md: string | null;
  /** Where this line came from, so the UI can explain itself. */
  origin: "template" | "carried" | "action_item" | "project";
  carried_from_item_id?: string | null;
  action_item_ids?: string[];
};

export type NextAgendaInput = {
  template: AgendaTemplateItem[];
  /** Agenda items from the previous meeting still marked open/carried. */
  carriedItems: Pick<AgendaItemRow, "id" | "number" | "title" | "notes_md" | "status">[];
  /** Every action item still outstanding across all meetings in this series. */
  openActions: Pick<
    ActionItemRow,
    "id" | "title" | "owner_name" | "owner_email" | "due_date" | "status" | "is_external"
  >[];
  /** Active jobs, for the Progress Reports section. */
  projects: { id: string; title: string }[];
  previousMeeting?: Pick<MeetingRow, "id" | "meeting_date" | "status"> | null;
  today?: Date;
};

const MATTERS_ARISING = /matters arising/i;
const PROGRESS_REPORTS = /progress report/i;
const CONFIRM_MINUTES = /confirm previous minutes/i;

function formatDueLabel(due: string | null, today: Date) {
  const days = daysUntilDue(due, today);
  if (days === null) return "no due date";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  return `due in ${days} day${days === 1 ? "" : "s"}`;
}

function actionLine(
  a: NextAgendaInput["openActions"][number],
  today: Date
): string {
  const who = ownerLabel(a);
  return `- ${who} — ${a.title} (${formatDueLabel(a.due_date ?? null, today)})`;
}

/**
 * Builds the draft agenda for the next meeting in a series.
 *
 * Renumbering follows the template's own numbering; sub-lines under a section
 * get `N.1`, `N.2`, … so the minutes read the way Robby writes them.
 */
export function buildNextAgenda(input: NextAgendaInput): DraftAgendaItem[] {
  const today = input.today ?? new Date();
  const openActions = input.openActions.filter((a) =>
    OPEN_ACTION_STATUSES.includes(a.status)
  );

  const out: DraftAgendaItem[] = [];
  let mattersArisingUsed = false;

  input.template.forEach((tpl, index) => {
    const number = tpl.number?.trim() || String(index + 1);
    const title = tpl.title.trim();

    if (CONFIRM_MINUTES.test(title)) {
      const note = input.previousMeeting
        ? `Minutes of ${new Date(`${input.previousMeeting.meeting_date}T12:00:00`).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" }
          )} — ${
            input.previousMeeting.status === "approved"
              ? "already approved"
              : "for confirmation"
          }.`
        : "No previous minutes on file.";
      out.push({ number, title, notes_md: note, origin: "template" });
      return;
    }

    // The first Matters Arising section carries the outstanding work. A second
    // one later in the template (Robby's agenda has two) stays empty for
    // anything raised live in the room.
    if (MATTERS_ARISING.test(title) && !mattersArisingUsed) {
      mattersArisingUsed = true;
      const lines: string[] = [];

      if (input.carriedItems.length) {
        lines.push("**Carried forward**");
        for (const c of input.carriedItems) {
          lines.push(`- ${[c.number, c.title].filter(Boolean).join(" ")}`);
        }
      }

      if (openActions.length) {
        if (lines.length) lines.push("");
        lines.push("**Open action items**");
        for (const a of openActions) lines.push(actionLine(a, today));
      }

      out.push({
        number,
        title,
        notes_md: lines.length ? lines.join("\n") : "Nothing outstanding.",
        origin: openActions.length || input.carriedItems.length ? "carried" : "template",
        action_item_ids: openActions.map((a) => a.id),
      });
      return;
    }

    if (PROGRESS_REPORTS.test(title)) {
      out.push({ number, title, notes_md: null, origin: "template" });
      input.projects.forEach((p, i) => {
        out.push({
          number: `${number}.${i + 1}`,
          title: p.title,
          notes_md: null,
          origin: "project",
        });
      });
      return;
    }

    out.push({ number, title, notes_md: null, origin: "template" });
  });

  return out;
}

/** Renders a draft agenda as the plain text Robby would read off a page. */
export function formatAgendaText(
  meetingTitle: string,
  meetingDate: string,
  items: DraftAgendaItem[]
) {
  const date = new Date(`${meetingDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lines = [meetingTitle, date, "", "Agenda:", ""];
  for (const item of items) {
    lines.push(`${item.number}\t${item.title}`);
    if (item.notes_md) {
      for (const l of item.notes_md.split("\n")) lines.push(`\t${l}`);
    }
  }
  return lines.join("\n");
}
