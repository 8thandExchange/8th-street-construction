"use client";

import { useState } from "react";
import { updateSubcontractor, toggleSubcontractorActive } from "@/lib/actions/bids";

export type SubRow = {
  id: string;
  company_name: string;
  trade: string;
  license_number: string | null;
  insurance_expires: string | null;
  preferred: boolean;
  active: boolean;
  profile_id: string | null;
};

type ProfileOption = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

function insuranceWarning(expires: string | null): { label: string; className: string } | null {
  if (!expires) return null;
  const exp = new Date(expires + "T12:00:00").getTime();
  if (Number.isNaN(exp)) return null;
  const now = Date.now();
  const days = Math.ceil((exp - now) / 86_400_000);
  if (days < 0) {
    return {
      label: "Insurance expired",
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }
  if (days <= 30) {
    return {
      label: `Insurance expires in ${days}d`,
      className: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }
  return null;
}

export function SubcontractorRow({
  sub,
  profiles,
}: {
  sub: SubRow;
  profiles: ProfileOption[];
}) {
  const [editing, setEditing] = useState(false);
  const warning = insuranceWarning(sub.insurance_expires);

  return (
    <div
      className={`p-5 border bg-paper ${
        sub.active === false ? "border-ink/10 opacity-70" : "border-ink/15"
      }`}
    >
      <div className="flex justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium text-ink flex flex-wrap items-center gap-2">
            {sub.company_name}
            {sub.preferred && (
              <span className="text-[10px] font-mono text-copper uppercase tracking-wider">
                Preferred
              </span>
            )}
            {sub.active === false && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border bg-stone-100 text-stone-500 border-stone-200">
                Inactive
              </span>
            )}
            {warning && (
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${warning.className}`}
              >
                {warning.label}
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-stone-300 mt-1 uppercase">{sub.trade}</div>
          {sub.insurance_expires && (
            <div className="text-xs text-ink/50 mt-2">Insurance exp: {sub.insurance_expires}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 text-xs">
          <span className="text-stone-300">
            {sub.profile_id ? "Portal linked" : "No portal user"}
          </span>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:text-ink"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <form action={toggleSubcontractorActive}>
            <input type="hidden" name="id" value={sub.id} />
            <input type="hidden" name="active" value={String(sub.active !== false)} />
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:text-copper"
            >
              {sub.active === false ? "Activate" : "Deactivate"}
            </button>
          </form>
        </div>
      </div>

      {editing && (
        <form
          action={updateSubcontractor}
          className="mt-5 pt-5 border-t border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input type="hidden" name="id" value={sub.id} />
          <div>
            <label className="field-label">Company *</label>
            <input
              name="company_name"
              required
              defaultValue={sub.company_name}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Trade *</label>
            <input name="trade" required defaultValue={sub.trade} className="field-input" />
          </div>
          <div>
            <label className="field-label">Portal user</label>
            <select name="profile_id" defaultValue={sub.profile_id ?? ""} className="field-input">
              <option value="">— None —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">License #</label>
            <input
              name="license_number"
              defaultValue={sub.license_number ?? ""}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Insurance expires</label>
            <input
              type="date"
              name="insurance_expires"
              defaultValue={sub.insurance_expires ?? ""}
              className="field-input"
            />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="preferred"
              defaultChecked={sub.preferred}
              className="accent-copper"
            />
            Preferred vendor
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-10 px-5 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
