"use client";

import { useActionState } from "react";
import { emailMinutesAction, type EmailMinutesState } from "@/lib/actions/meetings";

/**
 * "Email to attendees" with visible outcomes. The old plain form gave no
 * feedback at all — a successful send and a failed one looked identical.
 */
export function EmailMinutesButton({
  meetingId,
  recipients,
}: {
  meetingId: string;
  recipients: string[];
}) {
  const [state, formAction, pending] = useActionState<EmailMinutesState, FormData>(
    emailMinutesAction,
    { status: "idle" }
  );

  if (recipients.length === 0) {
    return (
      <div>
        <button type="button" disabled className="app-btn app-btn-secondary opacity-50">
          Email to attendees
        </button>
        <p className="mt-1.5 text-xs app-muted">
          No attendee has an email address on file yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={meetingId} />
        <button type="submit" disabled={pending} className="app-btn app-btn-secondary">
          {pending
            ? "Sending…"
            : `Email to attendees (${recipients.length})`}
        </button>
      </form>
      {state.status === "sent" && (
        <p className="mt-1.5 text-xs text-emerald-700">
          Sent to {state.recipients.join(", ")}.
        </p>
      )}
      {state.status === "error" && (
        <p className="mt-1.5 text-xs text-rust">{state.message}</p>
      )}
    </div>
  );
}
