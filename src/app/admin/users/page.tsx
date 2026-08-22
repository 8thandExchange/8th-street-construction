import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { removePortalUser } from "@/lib/actions/portal-users";
import { denyAccessRequest } from "@/lib/actions/access-requests";
import { appStatusBadge } from "@/lib/project/status-badges";
import {
  ApproveRequestForm,
  InviteUserForm,
  ResetPasswordForm,
} from "./PortalAccessForms";
import { setStaffScope } from "@/lib/actions/staff-access";
import { STAFF_SCOPE_LABELS, STAFF_SCOPES } from "@/lib/auth/staff-scope";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  client: "Client",
  subcontractor: "Subcontractor",
};


export default async function AdminUsersPage() {
  const supabase = await createClient();
  const [{ data: users }, { data: requests }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role, first_name, last_name, must_change_password, portal_active, organization_name, created_at, staff_scope")
      .order("created_at", { ascending: true }),
    supabase
      .from("portal_access_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const pendingCount = (requests ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl">
      <span className="app-label">— Access Control</span>
      <h1 className="mt-2 app-h1">Portal Users</h1>
      <p className="mt-4 app-muted max-w-2xl leading-relaxed">
        Grant access with a temporary password — users sign in at{" "}
        <code className="text-xs">/login</code>, then set their own password on first login.
        Cofounders use <strong>Admin</strong> with a full scope. A project manager,
        superintendent, or bookkeeper also signs in as Admin, then this page
        narrows what they can do.
      </p>

      {pendingCount > 0 && (
        <div className="mt-8 p-5 border border-amber-200 bg-amber-50 text-sm text-amber-900">
          <strong>{pendingCount}</strong> pending access request{pendingCount > 1 ? "s" : ""} below.
        </div>
      )}

      {(requests ?? []).some((r) => r.status === "pending") && (
        <section className="mt-10">
          <h2 className="app-label mb-4">Pending Access Requests</h2>
          <ul className="space-y-4">
            {(requests ?? [])
              .filter((r) => r.status === "pending")
              .map((r) => (
                <li key={r.id} className="app-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-ink">
                        {[r.first_name, r.last_name].filter(Boolean).join(" ") || r.email}
                      </div>
                      <div className="text-xs app-muted mt-1">{r.email}</div>
                      <div className="app-label mt-2 !text-[11px]">
                        Requested: {ROLE_LABELS[r.requested_role] || r.requested_role}
                        {r.portal_path ? ` · ${r.portal_path}` : ""}
                      </div>
                      {r.message && (
                        <p className="mt-3 text-sm text-ink/70 whitespace-pre-wrap">{r.message}</p>
                      )}
                      <div className="text-[11px] app-muted mt-2">
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <ApproveRequestForm requestId={r.id} defaultRole={r.requested_role} />
                      <form
                        action={async (fd) => {
                          "use server";
                          await denyAccessRequest(fd);
                        }}
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-700 hover:underline"
                        >
                          Deny
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      <InviteUserForm />

      {(requests ?? []).some((r) => r.status !== "pending") && (
        <section className="mt-12">
          <h2 className="app-label mb-4">Recent Request History</h2>
          <ul className="space-y-2 text-sm">
            {(requests ?? [])
              .filter((r) => r.status !== "pending")
              .slice(0, 10)
              .map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 text-ink/70">
                  <span>{r.email}</span>
                  <span className={`${appStatusBadge("access_request", r.status)} capitalize`}>
                    {r.status}
                  </span>
                  <span className="text-xs app-muted">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="mt-12 app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th className="">User</th>
              <th className="">Role</th>
              <th className="">Portal</th>
              <th className="!text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                  </div>
                  <div className="text-xs app-muted mt-0.5">{u.email}</div>
                  {u.must_change_password && (
                    <div className="mt-1"><span className="app-badge app-badge-amber !h-[18px] !text-[11px]">Awaiting password change</span></div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="app-badge app-badge-neutral">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {u.role === "admin" && (
                    <form action={setStaffScope} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="profile_id" value={u.id} />
                      <label className="sr-only" htmlFor={`scope-${u.id}`}>
                        Staff scope for {u.email}
                      </label>
                      <select
                        id={`scope-${u.id}`}
                        name="staff_scope"
                        defaultValue={u.staff_scope ?? "full"}
                        className="field-input !h-8 !text-xs"
                      >
                        {STAFF_SCOPES.map((scope) => (
                          <option key={scope} value={scope}>
                            {STAFF_SCOPE_LABELS[scope]}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="app-btn app-btn-ghost !h-8 !text-xs">
                        Save
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.role === "client" ? (
                    <div className="space-y-2">
                      <span
                        className={`app-badge ${
                          u.portal_active ? "app-badge-green" : "app-badge-neutral"
                        }`}
                      >
                        {u.portal_active ? "Active" : "Suspended"}
                      </span>
                      <Link
                        href={`/admin/users/${u.id}/access`}
                        className="block text-[13px] font-medium text-copper hover:underline"
                      >
                        Project access →
                      </Link>
                    </div>
                  ) : (
                    <span className="app-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-4">
                  <ResetPasswordForm userId={u.id} />
                  <form
                    action={async (fd) => {
                      "use server";
                      await removePortalUser(fd);
                    }}
                    className="inline"
                  >
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
