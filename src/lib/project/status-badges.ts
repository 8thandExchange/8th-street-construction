/**
 * Single source for admin status pills. Every status family maps to one of
 * the Mercury-grade `.app-badge-*` tones, replacing the per-page color maps
 * that had drifted apart. Admin surfaces only — the client portal keeps its
 * editorial chips (labels.ts *_STYLES).
 */

const TONES = {
  milestone: {
    pending: "neutral",
    in_progress: "accent",
    completed: "green",
    blocked: "amber",
  },
  change_order: {
    draft: "neutral",
    pending_client: "blue",
    approved: "green",
    rejected: "red",
  },
  project: {
    draft: "neutral",
    pre_construction: "blue",
    in_progress: "accent",
    completed: "green",
    on_hold: "amber",
    archived: "neutral",
  },
  plan_set: {
    draft: "neutral",
    pending_client: "blue",
    approved: "green",
    revision_requested: "amber",
  },
  selection: {
    pending: "neutral",
    client_review: "accent",
    selected: "blue",
    ordered: "blue",
    installed: "green",
    approved: "green",
  },
  task: {
    todo: "neutral",
    in_progress: "accent",
    blocked: "amber",
    done: "green",
    cancelled: "neutral",
  },
  draw: {
    scheduled: "neutral",
    invoiced: "amber",
    paid: "green",
    skipped: "neutral",
    cancelled: "red",
  },
  invoice: {
    draft: "neutral",
    sent: "amber",
    viewed: "blue",
    paid: "green",
    partial: "amber",
    overdue: "red",
    void: "neutral",
  },
  lead: {
    new: "accent",
    contacted: "blue",
    qualified: "green",
    proposal_sent: "blue",
    won: "green",
    lost: "neutral",
    archived: "neutral",
  },
  consultation: {
    requested: "accent",
    confirmed: "green",
    completed: "blue",
    cancelled: "neutral",
    no_show: "amber",
  },
  compliance: {
    active: "green",
    expiring_soon: "amber",
    expired: "red",
    pending: "neutral",
    not_applicable: "neutral",
  },
  access_request: {
    pending: "amber",
    approved: "green",
    denied: "neutral",
  },
  purchase_order: {
    draft: "neutral",
    issued: "accent",
    billed: "amber",
    closed: "green",
    cancelled: "red",
  },
} satisfies Record<string, Record<string, string>>;

export type StatusFamily = keyof typeof TONES;

export function appStatusBadge(family: StatusFamily, status: string): string {
  const tone =
    (TONES[family] as Record<string, string>)[status] ?? "neutral";
  return `app-badge app-badge-${tone}`;
}

/**
 * Color-only map for components that draw their own pill shape
 * (e.g. InlineStatusSelect). app-badge-* classes set background + text
 * color only, so they compose onto a <select> safely.
 */
export function appStatusSelectStyles(family: StatusFamily): Record<string, string> {
  return Object.fromEntries(
    Object.entries(TONES[family] as Record<string, string>).map(([status, tone]) => [
      status,
      `app-badge-${tone} border-transparent`,
    ])
  );
}
