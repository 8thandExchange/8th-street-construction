import { createAdminClient } from "@/lib/supabase/admin";
import { reportError } from "@/lib/observability/report-error";

/**
 * Company audit trail for consequential HUMAN actions — money movement, access
 * changes, and auth events. The AI surface has its own trail
 * (assistant_audit_events); this one covers the people.
 *
 * Best-effort by design: an audit insert failure must never abort the action
 * it describes (the ACH already went out; refusing to record it helps nobody).
 * But a failed write is itself an incident, so it goes to the error reporter
 * rather than vanishing.
 */

export type AuditEvent = {
  /** Profile id of the person acting; null for unauthenticated events. */
  actorId: string | null;
  /** Dot-scoped verb, e.g. "vendor_bill.ach_sent", "portal_user.invited". */
  action: string;
  entityType?: string;
  /** UUID of the record acted on, when there is one. */
  entityId?: string | null;
  /** Small, non-sensitive context: amounts, statuses, last4 — never secrets. */
  metadata?: Record<string, unknown>;
};

export async function writeAudit(event: AuditEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_id: event.actorId,
      action: event.action,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      metadata: event.metadata ?? null,
    });
    if (error) {
      reportError("audit.write_failed", error.message, { action: event.action });
    }
  } catch (err) {
    reportError("audit.write_failed", err, { action: event.action });
  }
}
