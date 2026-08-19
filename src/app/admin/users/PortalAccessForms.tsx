"use client";

import { useActionState } from "react";
import { invitePortalUser, resetPortalPassword } from "@/lib/actions/portal-users";
import { approveAccessRequest } from "@/lib/actions/access-requests";
import type { ProvisionActionResult } from "@/lib/auth/portal-access";

/**
 * The three actions that hand somebody a password. Each one can succeed at
 * creating the account and still fail to deliver the credentials, so every
 * form reports what actually happened instead of silently reloading.
 */
type ProvisionState = ProvisionActionResult | null;

/**
 * The password is shown only when it did not reach the user — that is the
 * moment an admin has to relay it by hand. On a successful send it stays
 * off the screen; it is already in their inbox.
 */
function CredentialsNotice({ state }: { state: ProvisionState }) {
  if (!state) return null;

  if ("error" in state) {
    return <p className="mt-3 text-xs text-rust">{state.error}</p>;
  }

  if (state.email.status === "sent") {
    return (
      <p className="mt-3 text-xs text-emerald-700">
        Account ready — temporary password emailed.
      </p>
    );
  }

  return (
    <div className="mt-3 p-3 border border-amber-200 bg-amber-50 text-xs text-amber-900">
      <p className="font-medium">
        {state.email.status === "failed"
          ? "Account created, but the email did not send."
          : "Account created. No email was requested."}
      </p>
      {state.email.status === "failed" && (
        <p className="mt-1 text-amber-800/80">{state.email.reason}</p>
      )}
      <p className="mt-2">
        Give them this password directly —{" "}
        <code className="font-mono bg-white/70 px-1 py-0.5 border border-amber-200">
          {state.tempPassword}
        </code>
      </p>
    </div>
  );
}

export function ApproveRequestForm({
  requestId,
  defaultRole,
}: {
  requestId: string;
  defaultRole: string;
}) {
  const [state, formAction, pending] = useActionState<ProvisionState, FormData>(
    async (_prev, fd) => approveAccessRequest(fd),
    null
  );

  return (
    <div>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={requestId} />
        <select name="role" className="text-xs" defaultValue={defaultRole}>
          <option value="client">Client</option>
          <option value="subcontractor">Subcontractor</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={pending} className="app-btn app-btn-primary">
          {pending ? "Approving…" : "Approve & Send Login"}
        </button>
      </form>
      <CredentialsNotice state={state} />
    </div>
  );
}

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState<ProvisionState, FormData>(
    async (_prev, fd) => invitePortalUser(fd),
    null
  );

  return (
    <form action={formAction} className="mt-10 app-card p-8 space-y-5">
      <h2 className="app-label">Grant access directly</h2>
      <p className="text-sm app-muted">
        Creates an account and emails a temporary password. User must set a new password on first
        sign-in.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Email *</label>
          <input name="email" type="email" required className="field-input" />
        </div>
        <div>
          <label className="field-label">Role *</label>
          <select name="role" className="field-input" defaultValue="client">
            <option value="client">Client</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="field-label">First name</label>
          <input name="first_name" className="field-input" />
        </div>
        <div>
          <label className="field-label">Last name</label>
          <input name="last_name" className="field-input" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="app-btn app-btn-primary">
        {pending ? "Granting…" : "Grant Access & Email Password"}
      </button>
      <CredentialsNotice state={state} />
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<ProvisionState, FormData>(
    async (_prev, fd) => resetPortalPassword(fd),
    null
  );

  return (
    <div className="inline-block align-top text-left">
      <form action={formAction} className="inline">
        <input type="hidden" name="id" value={userId} />
        <button
          type="submit"
          disabled={pending}
          className="app-btn app-btn-ghost !h-7 !px-2 !text-[12px]"
        >
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </form>
      <CredentialsNotice state={state} />
    </div>
  );
}
