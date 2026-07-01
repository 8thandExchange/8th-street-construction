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

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  client: "Client",
  subcontractor: "Subcontractor",
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-200 text-amber-800 bg-amber-50",
  approved: "border-emerald-200 text-emerald-700 bg-emerald-50",
  denied: "border-stone-200 text-stone-500 bg-stone-50",
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
    <div className="p-8 md:p-12 max-w-4xl">
      <span className="eyebrow">— Access Control</span>
      <h1 className="mt-2 font-display text-display-md text-ink">Portal Users</h1>
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
                <li key={r.id} className="bg-paper border border-ink/15 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-ink">
                        {[r.first_name, r.last_name].filter(Boolean).join(" ") || r.email}
                      </div>
                      <div className="text-xs font-mono text-stone-300 mt-1">{r.email}</div>
                      <div className="text-xs font-mono uppercase tracking-wider text-stone-300 mt-2">
                        Requested: {ROLE_LABELS[r.requested_role] || r.requested_role}
                        {r.portal_path ? ` · ${r.portal_path}` : ""}
                      </div>
                      {r.message && (
                        <p className="mt-3 text-sm text-ink/70 whitespace-pre-wrap">{r.message}</p>
                      )}
                      <div className="text-[10px] font-mono text-stone-300 mt-2">
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
                        <select name="role" className="field-input text-xs py-2" defaultValue={r.requested_role}>
                          <option value="client">Client</option>
                          <option value="subcontractor">Subcontractor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="submit"
                          className="h-9 px-4 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.15em] uppercase whitespace-nowrap"
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
                          className="w-full text-[10px] font-mono uppercase tracking-wider text-stone-300 hover:text-red-600"
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
        className="mt-10 bg-paper border border-ink/15 p-8 space-y-5"
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
          className="inline-flex h-11 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
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
                  <span
                    className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${REQUEST_STATUS_STYLES[r.status]}`}
                  >
                    {r.status}
                  </span>
                  <span className="text-xs font-mono text-stone-300">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="mt-12 bg-paper border border-ink/15">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left">
              <th className="px-6 py-4 eyebrow">User</th>
              <th className="px-6 py-4 eyebrow">Role</th>
              <th className="px-6 py-4 eyebrow">Portal</th>
              <th className="px-6 py-4 eyebrow text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-ink">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                  </div>
                  <div className="text-xs font-mono text-stone-300 mt-0.5">{u.email}</div>
                  {u.must_change_password && (
                    <div className="text-[9px] font-mono uppercase tracking-wider text-amber-700 mt-1">
                      Awaiting password change
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border border-ink/20">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
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
                    <span className="text-stone-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-4">
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
                      className="text-[10px] font-mono uppercase tracking-wider text-stone-300 hover:text-ink"
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
                      className="text-[10px] font-mono uppercase tracking-wider text-stone-300 hover:text-red-600"
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
