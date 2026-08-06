import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { actionItemNudgeEmail } from "@/lib/email/templates/action-item-nudge";
import type { ActionItemRow } from "./types";
import { OPEN_ACTION_STATUSES, ownerLabel } from "./types";
import { daysUntilDue } from "./minutes-format";

/**
 * The "where are we at?" engine.
 *
 * A daily pass over every open action item decides who needs asking, groups
 * the asks into one digest per person, and logs that it asked. The admin
 * replies in the assistant ("Robby's got the Eve St dates — week of the 24th")
 * and the reply lands on the item as an update, which is what closes the loop.
 *
 * External owners (Habitat staff, subs) are never emailed automatically —
 * their items surface in the internal digest as "waiting on", so chasing an
 * outside party stays a human decision.
 */

export type NudgeTier = "upcoming" | "due" | "overdue" | "stale";

/** How long before the same item + tier may be nudged again. */
const TIER_COOLDOWN_DAYS: Record<NudgeTier, number> = {
  upcoming: 7,
  due: 3,
  overdue: 3,
  stale: 7,
};

/** An item with no due date is "stale" once this many days pass with no update. */
const STALE_AFTER_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 2;

export type NudgeCandidate = {
  item: ActionItemRow;
  tier: NudgeTier;
};

export type NudgeSelectionInput = {
  items: ActionItemRow[];
  /** ISO timestamp of the most recent update per action item id. */
  lastUpdateAt: Record<string, string | undefined>;
  today?: Date;
};

function daysSince(iso: string | null | undefined, today: Date): number | null {
  if (!iso) return null;
  return Math.floor((today.getTime() - new Date(iso).getTime()) / 86400000);
}

/**
 * Decides which items deserve an ask today. Pure, so the rules are testable
 * without a database or an outbox.
 */
export function selectNudges(input: NudgeSelectionInput): NudgeCandidate[] {
  const today = input.today ?? new Date();
  const out: NudgeCandidate[] = [];

  for (const item of input.items) {
    if (!item.nudge_enabled) continue;
    if (!OPEN_ACTION_STATUSES.includes(item.status)) continue;

    const days = daysUntilDue(item.due_date, today);
    let tier: NudgeTier | null = null;

    if (days === null) {
      const lastTouch =
        input.lastUpdateAt[item.id] ?? item.updated_at ?? item.created_at;
      const idle = daysSince(lastTouch, today);
      if (idle !== null && idle >= STALE_AFTER_DAYS) tier = "stale";
    } else if (days < 0) {
      tier = "overdue";
    } else if (days === 0) {
      tier = "due";
    } else if (days <= UPCOMING_WINDOW_DAYS) {
      tier = "upcoming";
    }

    if (!tier) continue;

    // Cooldown: don't ask the same question twice in the same few days.
    const sinceLastNudge = daysSince(item.last_nudge_at, today);
    if (sinceLastNudge !== null && sinceLastNudge < TIER_COOLDOWN_DAYS[tier]) continue;

    out.push({ item, tier });
  }

  const rank: Record<NudgeTier, number> = { overdue: 0, due: 1, upcoming: 2, stale: 3 };
  return out.sort((a, b) => {
    if (rank[a.tier] !== rank[b.tier]) return rank[a.tier] - rank[b.tier];
    return (a.item.due_date ?? "9999").localeCompare(b.item.due_date ?? "9999");
  });
}

export type NudgeGroup = {
  /** Email the digest goes to. */
  recipient: string;
  recipientName: string;
  /** Items this person owns. */
  owned: NudgeCandidate[];
  /** Items owned by an outside party that this person is waiting on. */
  waitingOn: NudgeCandidate[];
};

/**
 * Groups candidates into one digest per internal recipient. Anything owned by
 * an external party (or by nobody) is routed to the admins as "waiting on".
 */
export function groupNudges(
  candidates: NudgeCandidate[],
  internalEmails: Record<string, { email: string; name: string }>,
  adminRecipients: { email: string; name: string }[]
): NudgeGroup[] {
  const groups = new Map<string, NudgeGroup>();

  const ensure = (email: string, name: string) => {
    const key = email.toLowerCase();
    let g = groups.get(key);
    if (!g) {
      g = { recipient: email, recipientName: name, owned: [], waitingOn: [] };
      groups.set(key, g);
    }
    return g;
  };

  for (const candidate of candidates) {
    const { item } = candidate;
    const internal =
      item.owner_profile_id && internalEmails[item.owner_profile_id]
        ? internalEmails[item.owner_profile_id]
        : null;

    if (internal && !item.is_external) {
      ensure(internal.email, internal.name).owned.push(candidate);
      continue;
    }

    // External or unassigned — the company chases it, the outsider isn't emailed.
    for (const admin of adminRecipients) {
      ensure(admin.email, admin.name).waitingOn.push(candidate);
    }
  }

  return [...groups.values()].filter((g) => g.owned.length || g.waitingOn.length);
}

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM =
  process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";

export type NudgeRunResult = {
  candidates: number;
  digests: number;
  recipients: string[];
  skipped: string[];
  dryRun: boolean;
};

/**
 * Daily run. Called by the cron and by the assistant's request_action_updates
 * tool (which is gated behind the admin approval card, since it sends mail).
 */
export async function runActionItemNudges(options?: {
  dryRun?: boolean;
  /** Limit to one meeting's items — used by "chase everything from Tuesday". */
  meetingId?: string;
}): Promise<NudgeRunResult> {
  const admin = createAdminClient();
  const dryRun = options?.dryRun ?? false;
  const skipped: string[] = [];

  let query = admin
    .from("meeting_action_items")
    .select("*")
    .in("status", OPEN_ACTION_STATUSES);
  if (options?.meetingId) query = query.eq("meeting_id", options.meetingId);

  const { data: rows } = await query;
  const items = (rows ?? []) as ActionItemRow[];

  if (!items.length) {
    return { candidates: 0, digests: 0, recipients: [], skipped, dryRun };
  }

  const { data: updates } = await admin
    .from("meeting_action_updates")
    .select("action_item_id, created_at")
    .in(
      "action_item_id",
      items.map((i) => i.id)
    )
    .order("created_at", { ascending: false });

  const lastUpdateAt: Record<string, string | undefined> = {};
  for (const u of updates ?? []) {
    if (!lastUpdateAt[u.action_item_id]) lastUpdateAt[u.action_item_id] = u.created_at;
  }

  const candidates = selectNudges({ items, lastUpdateAt });
  if (!candidates.length) {
    return { candidates: 0, digests: 0, recipients: [], skipped, dryRun };
  }

  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("role", "admin");

  const internalEmails: Record<string, { email: string; name: string }> = {};
  for (const p of admins ?? []) {
    if (!p.email) continue;
    internalEmails[p.id] = {
      email: p.email,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
    };
  }

  const adminRecipients = Object.values(internalEmails);
  if (!adminRecipients.length) {
    adminRecipients.push({
      email: process.env.EMAIL_TO_LEADS || "hello@8thstreetconstruction.com",
      name: "8th Street",
    });
  }

  const groups = groupNudges(candidates, internalEmails, adminRecipients);
  const client = resendClient();
  const recipients: string[] = [];
  let digests = 0;

  for (const group of groups) {
    if (dryRun || !client) {
      skipped.push(group.recipient);
      continue;
    }

    const { subject, html, text } = actionItemNudgeEmail(group);
    await client.emails.send({
      from: FROM,
      to: group.recipient,
      subject,
      html,
      text,
    });

    digests++;
    recipients.push(group.recipient);

    // Only items the person actually owns count as "asked" — a waiting-on
    // line in someone else's digest shouldn't start the owner's cooldown.
    const nowIso = new Date().toISOString();
    for (const c of group.owned) {
      await admin
        .from("meeting_action_items")
        .update({
          last_nudge_at: nowIso,
          nudge_count: c.item.nudge_count + 1,
        })
        .eq("id", c.item.id);

      await admin.from("meeting_nudge_log").insert({
        action_item_id: c.item.id,
        sent_to: group.recipient,
        tier: c.tier,
      });
    }

    for (const c of group.waitingOn) {
      await admin.from("meeting_nudge_log").insert({
        action_item_id: c.item.id,
        sent_to: `${group.recipient} (waiting on ${ownerLabel(c.item)})`,
        tier: c.tier,
      });
    }
  }

  return { candidates: candidates.length, digests, recipients, skipped, dryRun };
}
