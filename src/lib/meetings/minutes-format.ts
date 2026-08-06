import type {
  ActionItemRow,
  AgendaItemRow,
  AttendeeRow,
  DecisionRow,
  MeetingRow,
} from "./types";
import { ownerLabel } from "./types";

/**
 * Minutes rendering. One canonical text form used for the on-screen record,
 * the emailed copy, and the frozen snapshot taken at approval — so what the
 * board approves is byte-for-byte what gets circulated and stored.
 */

export type MinutesBundle = {
  meeting: MeetingRow;
  attendees: AttendeeRow[];
  agendaItems: AgendaItemRow[];
  decisions: DecisionRow[];
  actionItems: ActionItemRow[];
};

export function formatMeetingDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDueDate(date: string | null) {
  if (!date) return "No date set";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Whole days until due; negative means overdue, 0 means today. Both sides are
 * snapped to local midnight so a meeting at 9am and one at 9pm agree on what
 * "due today" means.
 */
export function daysUntilDue(due: string | null, today = new Date()): number | null {
  if (!due) return null;
  const [year, month, day] = due.split("-").map(Number);
  if (!year || !month || !day) return null;
  const dueMidnight = new Date(year, month - 1, day).getTime();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  return Math.round((dueMidnight - todayMidnight) / 86400000);
}

export function renderMinutesMarkdown(bundle: MinutesBundle): string {
  const { meeting, attendees, agendaItems, decisions, actionItems } = bundle;
  const lines: string[] = [];

  lines.push(`# ${meeting.title}`);
  lines.push("");
  lines.push(`**Date:** ${formatMeetingDate(meeting.meeting_date)}`);
  if (meeting.location) lines.push(`**Location:** ${meeting.location}`);
  lines.push("");

  const present = attendees.filter((a) => a.present);
  const apologies = attendees.filter((a) => !a.present || a.role === "apology");

  if (present.length) {
    lines.push("**Present:**");
    for (const a of present) {
      const bits = [a.name];
      if (a.organization) bits.push(`(${a.organization})`);
      if (a.role && a.role !== "attendee") bits.push(`— ${a.role}`);
      lines.push(`- ${bits.join(" ")}`);
    }
    lines.push("");
  }

  if (apologies.length) {
    lines.push("**Apologies:**");
    for (const a of apologies) lines.push(`- ${a.name}`);
    lines.push("");
  }

  if (meeting.summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(meeting.summary);
    lines.push("");
  }

  if (agendaItems.length) {
    lines.push("## Agenda & Discussion");
    lines.push("");
    for (const item of agendaItems) {
      lines.push(`### ${[item.number, item.title].filter(Boolean).join(". ")}`);
      lines.push("");
      if (item.notes_md) {
        lines.push(item.notes_md.trim());
        lines.push("");
      }
      if (item.outcome) {
        lines.push(`**Outcome:** ${item.outcome}`);
        lines.push("");
      }
      const carried = item.status === "carried" || item.status === "open";
      if (carried) {
        lines.push("_Carried to next meeting._");
        lines.push("");
      }
    }
  }

  if (decisions.length) {
    lines.push("## Decisions");
    lines.push("");
    decisions.forEach((d, i) => {
      lines.push(`${i + 1}. ${d.decision}`);
      if (d.rationale) lines.push(`   _${d.rationale}_`);
      if (d.moved_by || d.seconded_by) {
        const bits = [
          d.moved_by ? `Moved by ${d.moved_by}` : null,
          d.seconded_by ? `seconded by ${d.seconded_by}` : null,
        ].filter(Boolean);
        lines.push(`   ${bits.join(", ")}.`);
      }
    });
    lines.push("");
  }

  if (actionItems.length) {
    lines.push("## Action Items");
    lines.push("");
    for (const a of actionItems) {
      const who = ownerLabel(a);
      const due = a.due_date ? ` — due ${formatDueDate(a.due_date)}` : "";
      lines.push(`- **${who}** — ${a.title}${due}`);
      if (a.detail) lines.push(`  ${a.detail}`);
    }
    lines.push("");
  }

  if (meeting.next_meeting_date) {
    lines.push("## Next Meeting");
    lines.push("");
    lines.push(formatMeetingDate(meeting.next_meeting_date));
    lines.push("");
  }

  if (meeting.status === "approved" && meeting.approved_at) {
    lines.push("---");
    lines.push("");
    lines.push(
      `_Approved ${new Date(meeting.approved_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}._`
    );
  }

  return lines.join("\n").trim();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Minimal markdown → HTML for the emailed minutes. Deliberately narrow: it
 * handles exactly what renderMinutesMarkdown emits (headings, bullets,
 * numbered lists, bold, italics) rather than pulling in a parser.
 */
export function minutesMarkdownToHtml(markdown: string, colors: {
  ink: string;
  pencil: string;
  rust: string;
  border: string;
}): string {
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`)
      .replace(/_(.+?)_/g, `<em>$1</em>`);

  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      out.push(
        `<h3 style="font-size:15px;margin:24px 0 6px;color:${colors.ink};">${inline(line.slice(4))}</h3>`
      );
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      out.push(
        `<h2 style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${colors.pencil};margin:32px 0 10px;">${inline(
          line.slice(3)
        )}</h2>`
      );
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      out.push(
        `<h1 style="font-size:24px;font-weight:500;margin:0 0 4px;color:${colors.ink};">${inline(line.slice(2))}</h1>`
      );
      continue;
    }
    if (line.trim() === "---") {
      closeList();
      out.push(`<hr style="border:0;border-top:1px solid ${colors.border};margin:28px 0;" />`);
      continue;
    }

    const bullet = line.match(/^(\s*)- (.*)$/);
    if (bullet) {
      if (listType !== "ul") {
        closeList();
        out.push(`<ul style="margin:0 0 12px;padding-left:20px;color:${colors.ink};">`);
        listType = "ul";
      }
      out.push(`<li style="margin:4px 0;line-height:1.6;">${inline(bullet[2])}</li>`);
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      if (listType !== "ol") {
        closeList();
        out.push(`<ol style="margin:0 0 12px;padding-left:20px;color:${colors.ink};">`);
        listType = "ol";
      }
      out.push(`<li style="margin:4px 0;line-height:1.6;">${inline(numbered[1])}</li>`);
      continue;
    }

    closeList();
    out.push(
      `<p style="margin:0 0 10px;line-height:1.65;color:${colors.ink};">${inline(line.trim())}</p>`
    );
  }

  closeList();
  return out.join("\n");
}
