import { getSiteUrl } from "@/lib/brand/assets";
import { EMAIL_BRAND, EMAIL_FONT } from "../brand";
import { emailButton, emailLayout, escapeHtml } from "../layout";
import { formatDueDate, daysUntilDue } from "@/lib/meetings/minutes-format";
import { ownerLabel } from "@/lib/meetings/types";
import type { NudgeCandidate, NudgeGroup, NudgeTier } from "@/lib/meetings/nudges";

const { ink, pencil, rust, paper, borderLight } = EMAIL_BRAND;

const TIER_LABEL: Record<NudgeTier, string> = {
  overdue: "Overdue",
  due: "Due today",
  upcoming: "Coming up",
  stale: "No movement",
};

function dueText(c: NudgeCandidate) {
  const days = daysUntilDue(c.item.due_date);
  if (days === null) return "No due date set";
  if (days < 0) {
    const n = Math.abs(days);
    return `${formatDueDate(c.item.due_date)} — ${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return `${formatDueDate(c.item.due_date)} — today`;
  return `${formatDueDate(c.item.due_date)} — in ${days} day${days === 1 ? "" : "s"}`;
}

function itemRow(c: NudgeCandidate, opts: { showOwner: boolean }) {
  const tone = c.tier === "overdue" ? rust : pencil;
  const owner = opts.showOwner
    ? `<div style="font-size:13px;color:${pencil};margin-top:2px;">Waiting on ${escapeHtml(
        ownerLabel(c.item)
      )}${c.item.owner_org ? ` · ${escapeHtml(c.item.owner_org)}` : ""}</div>`
    : "";

  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${borderLight};">
        <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${tone};">${TIER_LABEL[c.tier]}</div>
        <div style="font-size:16px;color:${ink};margin-top:6px;line-height:1.4;">${escapeHtml(c.item.title)}</div>
        ${owner}
        <div style="font-size:13px;color:${pencil};margin-top:4px;">${escapeHtml(dueText(c))}</div>
      </td>
    </tr>`;
}

/**
 * The daily "where are we at?" digest. Written so it can be answered by
 * replying in plain English to the assistant — no form to fill in, no login
 * required to understand what's being asked.
 */
export function actionItemNudgeEmail(group: NudgeGroup) {
  const site = getSiteUrl();
  const firstName = group.recipientName.split(" ")[0] || "there";
  const total = group.owned.length + group.waitingOn.length;
  const overdue = [...group.owned, ...group.waitingOn].filter(
    (c) => c.tier === "overdue"
  ).length;

  const ownedBlock = group.owned.length
    ? `
      <h2 style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${pencil};margin:28px 0 4px;">Yours</h2>
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        ${group.owned.map((c) => itemRow(c, { showOwner: false })).join("")}
      </table>`
    : "";

  const waitingBlock = group.waitingOn.length
    ? `
      <h2 style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${pencil};margin:28px 0 4px;">Waiting on others</h2>
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        ${group.waitingOn.map((c) => itemRow(c, { showOwner: true })).join("")}
      </table>`
    : "";

  const body = `
    <p style="font-size:16px;line-height:1.6;color:${ink};margin:0 0 8px;">Morning ${escapeHtml(firstName)},</p>
    <p style="font-size:16px;line-height:1.6;color:${ink};margin:0;">
      ${total === 1 ? "One action item needs" : `${total} action items need`} an update${
        overdue ? ` — ${overdue} of them already past due` : ""
      }.
    </p>
    ${ownedBlock}
    ${waitingBlock}
    <div style="margin:28px 0 0;padding:18px 20px;background:${paper};border-left:3px solid ${rust};">
      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${pencil};">How to answer</div>
      <p style="font-size:15px;line-height:1.6;color:${ink};margin:8px 0 0;">
        Open the Assistant and just say where things are, in your own words — for example
        <em>"Eve St groundbreaking is set for the week of the 24th, that one's done."</em>
        It records the update against the right item and moves it along. No forms.
      </p>
    </div>
    ${emailButton(`${site}/admin/meetings/action-items`, "Open action items")}
  `;

  const textLines = [
    `Morning ${firstName},`,
    "",
    `${total} action item${total === 1 ? "" : "s"} need an update.`,
    "",
  ];
  if (group.owned.length) {
    textLines.push("YOURS");
    for (const c of group.owned) {
      textLines.push(`- [${TIER_LABEL[c.tier]}] ${c.item.title} (${dueText(c)})`);
    }
    textLines.push("");
  }
  if (group.waitingOn.length) {
    textLines.push("WAITING ON OTHERS");
    for (const c of group.waitingOn) {
      textLines.push(
        `- [${TIER_LABEL[c.tier]}] ${c.item.title} — ${ownerLabel(c.item)} (${dueText(c)})`
      );
    }
    textLines.push("");
  }
  textLines.push(
    "Reply by telling the Assistant where things are, in plain English.",
    `${site}/admin/meetings/action-items`
  );

  return {
    subject:
      overdue > 0
        ? `${overdue} action item${overdue === 1 ? "" : "s"} overdue — quick update?`
        : `Action items needing an update (${total})`,
    html: emailLayout({
      title: "Action items",
      preheader: `${total} action item${total === 1 ? "" : "s"} need an update`,
      body,
    }),
    text: textLines.join("\n"),
  };
}

export const NUDGE_FONT = EMAIL_FONT;
