"use client";

import { useActionState, useState } from "react";
import { emailMinutesAction, type EmailMinutesState } from "@/lib/actions/meetings";

export type MinutesRecipient = { name: string; email: string };

/**
 * "Email to attendees" with visible outcomes and recipient choice. The old
 * plain form gave no feedback at all — a successful send and a failed one
 * looked identical — and always mailed every attendee with an address.
 */
export function EmailMinutesButton({
  meetingId,
  recipients,
}: {
  meetingId: string;
  recipients: MinutesRecipient[];
}) {
  const [state, formAction, pending] = useActionState<EmailMinutesState, FormData>(
    emailMinutesAction,
    { status: "idle" }
  );
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(recipients.map((r) => r.email))
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

  const toggle = (email: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={meetingId} />
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="submit"
            disabled={pending || checked.size === 0}
            className="app-btn app-btn-secondary disabled:opacity-50"
          >
            {pending
              ? "Sending…"
              : `Email minutes (${checked.size} of ${recipients.length})`}
          </button>
          <details className="min-w-[220px]">
            <summary className="cursor-pointer list-none pt-2 text-xs text-copper hover:underline">
              Choose who gets them
            </summary>
            <div className="mt-2 space-y-1.5 rounded border border-navy/10 bg-white/40 p-3">
              {recipients.map((r) => (
                <label key={r.email} className="flex items-center gap-2 text-sm text-navy">
                  <input
                    type="checkbox"
                    name="to"
                    value={r.email}
                    checked={checked.has(r.email)}
                    onChange={() => toggle(r.email)}
                  />
                  <span>
                    {r.name} <span className="text-xs app-muted">({r.email})</span>
                  </span>
                </label>
              ))}
            </div>
          </details>
        </div>
      </form>
      {checked.size === 0 && (
        <p className="mt-1.5 text-xs app-muted">Pick at least one recipient.</p>
      )}
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
