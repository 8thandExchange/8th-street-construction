import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  invitePortalUser,
  removePortalUser,
  resetPortalPassword,
} from "@/lib/actions/portal-users";
import {
  approveAccessRequest,
  denyAccessRequest,
} from "@/lib/actions/access-requests";
import { appStatusBadge } from "@/lib/project/status-badges";

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
      .select("id, email, role, first_name, last_name, must_change_password, portal_active, organization_name, created_at")
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
      <span className="eyebrow">— Access Control</span>
      <h1 className="mt-2 app-h1">Portal Users</h1>
      <p className="mt-4 text-ink/65 max-w-2xl leading-relaxed">
        Grant access with a temporary password — users sign in at{" "}
        <code className="text-xs">/login</code>, then set their own password on first login.
        Cofounders and team members use the <strong>Admin</strong> role.
      </p>

      {pendingCount > 0 && (
        <div className="mt-8 p-5 border border-amber-200 bg-amber-50 text-sm text-amber-900">
          <strong>{pendingCount}</strong> pending access request{pendingCount > 1 ? "s" : ""} below.
        </div>
      )}

      {(requests ?? []).some((r) => r.status === "pending") && (
        <section className="mt-10">
          <h2 className="eyebrow mb-4">Pending Access Requests</h2>
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
                      <form
                        action={async (fd) => {
                          "use server";
                          await approveAccessRequest(fd);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <select name="role" className="text-xs" defaultValue={r.requested_role}>
                          <option value="client">Client</option>
                          <option value="subcontractor">Subcontractor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="submit"
                          className="h-9 px-4 app-btn app-btn-primary"
                        >
                          Approve & Send Login
                        </button>
                      </form>
                      <form
                        action={async (fd) => {
                          "use server";
                          await denyAccessRequest(fd);
                        }}
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="app-btn app-btn-ghost !h-8 w-full !text-[12.5px] hover:!text-red-600"
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

      <form
        action={async (fd) => {
          "use server";
          await invitePortalUser(fd);
        }}
        className="mt-10 app-card p-8 space-y-5"
      >
        <h2 className="eyebrow">Grant access directly</h2>
        <p className="text-sm text-ink/60">
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
        <button
          type="submit"
          className="inline-flex h-11 items-center px-5 app-btn app-btn-primary"
        >
          Grant Access & Email Password
        </button>
      </form>

      {(requests ?? []).some((r) => r.status !== "pending") && (
        <section className="mt-12">
          <h2 className="eyebrow mb-4">Recent Request History</h2>
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
                </td>
                <td className="px-4 py-3">
                  {u.role === "client" ? (
                    <div className="space-y-2">
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${
                          u.portal_active
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                            : "border-stone-200 text-stone-500 bg-stone-50"
                        }`}
                      >
                        {u.portal_active ? "Active" : "Suspended"}
                      </span>
                      <Link
                        href={`/admin/users/${u.id}/access`}
                        className="block text-[10px] font-mono uppercase text-copper hover:underline"
                      >
                        Project access →
                      </Link>
                    </div>
                  ) : (
                    <span className="app-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-4">
                  <form
                    action={async (fd) => {
                      "use server";
                      await resetPortalPassword(fd);
                    }}
                    className="inline"
                  >
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      className="app-btn app-btn-ghost !h-7 !px-2 !text-[12px]"
                    >
                      Reset password
                    </button>
                  </form>
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
                      className="app-btn app-btn-ghost !h-7 !px-2 !text-[12px] hover:!text-red-600"
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
