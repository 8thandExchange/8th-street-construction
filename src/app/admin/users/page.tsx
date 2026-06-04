import { createClient } from "@/lib/supabase/server";
import { invitePortalUser, removePortalUser, resendPortalInvite } from "@/lib/actions/portal-users";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  client: "Client",
  subcontractor: "Subcontractor",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <span className="eyebrow">— Access Control</span>
      <h1 className="mt-2 font-display text-display-md text-ink">Portal Users</h1>
      <p className="mt-4 text-ink/65 max-w-2xl leading-relaxed">
        Only approved users can sign in. Invite clients and subs here — they receive an email
        to activate their account. Random visitors cannot create logins.
      </p>

      <form
        action={async (fd) => {
          "use server";
          await invitePortalUser(fd);
        }}
        className="mt-10 bg-paper border border-ink/15 p-8 space-y-5"
      >
        <h2 className="eyebrow">Invite someone</h2>
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
          Send Invitation
        </button>
      </form>

      <div className="mt-12 bg-paper border border-ink/15">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left">
              <th className="px-6 py-4 eyebrow">User</th>
              <th className="px-6 py-4 eyebrow">Role</th>
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
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border border-ink/20">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-4">
                  <form
                    action={async (fd) => {
                      "use server";
                      await resendPortalInvite(fd);
                    }}
                    className="inline"
                  >
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      className="text-[10px] font-mono uppercase tracking-wider text-stone-300 hover:text-ink"
                    >
                      Resend invite
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
