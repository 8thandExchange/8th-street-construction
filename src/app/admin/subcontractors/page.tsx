import { createClient } from "@/lib/supabase/server";
import { createSubcontractor } from "@/lib/actions/bids";
import { SubcontractorRow, type SubRow } from "@/components/admin/SubcontractorRow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SubcontractorsPage() {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("subcontractors")
    .select("id, company_name, trade, license_number, insurance_expires, preferred, active, profile_id")
    .order("company_name");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("role", "subcontractor");

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl">
      <div className="mb-10">
        <span className="eyebrow">— Vendors</span>
        <h1 className="mt-2 app-h1">Subcontractors</h1>
        <p className="mt-3 text-ink/65">
          Directory for RFQ invitations. Link a portal user profile to enable bid submission.
        </p>
      </div>

      <form
        action={async (fd) => {
          "use server";
          await createSubcontractor(fd);
        }}
        className="p-6 border border-ink/15 bg-paper space-y-4 mb-10"
      >
        <h3 className="eyebrow">Add subcontractor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Company *</label>
            <input name="company_name" required className="field-input" />
          </div>
          <div>
            <label className="field-label">Trade *</label>
            <input name="trade" required className="field-input" placeholder="electrical" />
          </div>
          <div>
            <label className="field-label">Portal user</label>
            <select name="profile_id" className="field-input">
              <option value="">— None —</option>
              {(profiles ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">License #</label>
            <input name="license_number" className="field-input" />
          </div>
          <div>
            <label className="field-label">Insurance expires</label>
            <input type="date" name="insurance_expires" className="field-input" />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="preferred" className="accent-copper" />
            Preferred vendor
          </label>
        </div>
        <button type="submit" className="h-10 px-5 app-btn app-btn-primary">
          Add
        </button>
      </form>

      <div className="space-y-3">
        {(subs ?? []).map((s) => (
          <SubcontractorRow key={s.id} sub={s as SubRow} profiles={profiles ?? []} />
        ))}
        {!subs?.length && (
          <p className="text-ink/50 italic py-12 text-center border border-dashed border-ink/20">
            No subcontractors yet — add your first vendor above.
          </p>
        )}
      </div>

      <p className="mt-8 text-sm text-ink/50">
        Invite sub users at{" "}
        <Link href="/admin/users" className="text-copper hover:underline">
          Portal Users
        </Link>{" "}
        with role Subcontractor, then link them here.
      </p>
    </div>
  );
}
