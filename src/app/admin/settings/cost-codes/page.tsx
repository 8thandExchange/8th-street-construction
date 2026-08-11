import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/HubUI";
import { updateTemplateLine, updateTemplateTakeoff } from "@/lib/actions/cost-plan";

export const dynamic = "force-dynamic";

type TemplateLine = {
  id: string;
  code: string;
  label: string;
  section: string;
  line_type: string;
  unit: string | null;
  formula: string | null;
  default_amount: number | null;
  is_allowance: boolean;
};

type TemplateTakeoff = {
  id: string;
  key: string;
  label: string;
  unit: string | null;
  default_value: number | null;
  formula: string | null;
  section: string;
};

export default async function CostCodeSettingsPage(props: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template: requested } = await props.searchParams;
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("cost_code_templates")
    .select("id, name, description, is_default")
    .order("is_default", { ascending: false })
    .order("name");

  const active = (templates ?? []).find((t) => t.id === requested) ?? (templates ?? [])[0];

  if (!active) {
    return (
      <div className="max-w-3xl">
        <HubPageHeader title="Cost codes" description="No templates yet." />
      </div>
    );
  }

  const [{ data: lineRows }, { data: takeoffRows }] = await Promise.all([
    supabase
      .from("cost_code_template_lines")
      .select("id, code, label, section, line_type, unit, formula, default_amount, is_allowance")
      .eq("template_id", active.id)
      .order("display_order"),
    supabase
      .from("cost_code_template_takeoff")
      .select("id, key, label, unit, default_value, formula, section")
      .eq("template_id", active.id)
      .order("display_order"),
  ]);

  const lines = (lineRows ?? []) as TemplateLine[];
  const takeoff = (takeoffRows ?? []) as TemplateTakeoff[];

  const sections: { section: string; lines: TemplateLine[] }[] = [];
  for (const line of lines) {
    const last = sections[sections.length - 1];
    if (last && last.section === line.section) last.lines.push(line);
    else sections.push({ section: line.section, lines: [line] });
  }

  const typedTakeoff = takeoff.filter((t) => !t.formula);
  const derivedTakeoff = takeoff.filter((t) => t.formula);

  return (
    <div className="max-w-5xl">
      <HubPageHeader
        title="Cost codes"
        description="The standard code list every new job starts from. Changing it here does not touch jobs that already have a cost plan."
      />

      {(templates ?? []).length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {(templates ?? []).map((t) => (
            <Link
              key={t.id}
              href={`/admin/settings/cost-codes?template=${t.id}`}
              className={`app-btn ${t.id === active.id ? "app-btn-primary" : "app-btn-secondary"} !py-1.5 !text-xs`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      <div className="hub-panel p-5 mb-8">
        <h3 className="eyebrow mb-3">Takeoff defaults</h3>
        <p className="text-sm text-ink/55 mb-5">
          The named quantities formulas are priced from. {derivedTakeoff.length} of these are worked
          out from the others and can&apos;t be typed.
        </p>

        <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          {typedTakeoff.map((t) => (
            <form key={t.id} action={updateTemplateTakeoff} className="flex items-center gap-2 py-1">
              <input type="hidden" name="takeoff_id" value={t.id} />
              <input
                name="label"
                defaultValue={t.label}
                aria-label={`Label for ${t.key}`}
                className="field-input !py-1 !text-sm flex-1"
              />
              <code className="text-[11px] text-ink/35 font-mono w-36 truncate" title={t.key}>
                {t.key}
              </code>
              <input
                name="default_value"
                defaultValue={t.default_value ?? ""}
                aria-label={`Default for ${t.key}`}
                className="field-input !py-1 !text-sm w-20 text-right font-mono"
              />
              <button type="submit" className="app-btn app-btn-ghost !py-1 !text-xs">
                Save
              </button>
            </form>
          ))}
        </div>

        {derivedTakeoff.length > 0 && (
          <div className="mt-6 pt-5 border-t border-ink/8">
            <div className="app-label mb-3">Worked out automatically</div>
            <ul className="grid gap-1 md:grid-cols-2 text-sm">
              {derivedTakeoff.map((t) => (
                <li key={t.id} className="flex items-baseline gap-2">
                  <span className="text-ink/70">{t.label}</span>
                  <code className="text-[11px] font-mono text-ink/40">= {t.formula}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <h3 className="app-h2 !text-[16px] mb-1">
        {lines.length} lines
      </h3>
      <p className="text-sm text-ink/55 mb-6">
        A line with a formula is priced from the takeoff. Clear the formula to type a flat amount
        instead.
      </p>

      <div className="space-y-8">
        {sections.map((group) => (
          <section key={group.section}>
            <div className="app-label mb-2">{group.section}</div>
            <div className="border border-ink/10 divide-y divide-ink/8">
              {group.lines.map((line) => (
                <form
                  key={line.id}
                  action={updateTemplateLine}
                  className="grid grid-cols-[3rem_1fr] md:grid-cols-[3.5rem_1.4fr_1.6fr_7rem_5rem_4rem] gap-2 items-center px-3 py-2 bg-paper"
                >
                  <input type="hidden" name="line_id" value={line.id} />

                  <code className="font-mono text-xs text-ink/55">{line.code}</code>

                  <input
                    name="label"
                    defaultValue={line.label}
                    aria-label={`Label for ${line.code}`}
                    className="field-input !py-1 !text-sm"
                  />

                  <input
                    name="formula"
                    defaultValue={line.formula ?? ""}
                    aria-label={`Formula for ${line.code}`}
                    placeholder={line.line_type === "cost" ? "flat amount →" : "subtotal * 0.05"}
                    className="field-input !py-1 !text-sm font-mono"
                  />

                  <input
                    name="default_amount"
                    defaultValue={line.default_amount ?? ""}
                    aria-label={`Default amount for ${line.code}`}
                    placeholder="—"
                    disabled={Boolean(line.formula)}
                    className="field-input !py-1 !text-sm text-right font-mono disabled:opacity-40"
                  />

                  <label className="flex items-center gap-1.5 text-xs text-ink/60">
                    <input type="checkbox" name="is_allowance" defaultChecked={line.is_allowance} />
                    Allow
                  </label>

                  <button type="submit" className="app-btn app-btn-ghost !py-1 !text-xs">
                    Save
                  </button>
                </form>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10">
        <Link href="/admin/settings" className="app-label !text-copper hover:underline">
          ← Back to settings
        </Link>
      </div>
    </div>
  );
}
