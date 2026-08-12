/**
 * Import Robby's cost workbook.
 *
 * The workbook has five tabs. Four of them — AUGUSTA, RIVERWALK, Broad Street,
 * Savannah — are house models in the collection, not job sites, so they import
 * as cost code TEMPLATES: pick "The Augusta" when starting a job and its takeoff
 * and pricing come with it. The fifth, 608 Macon ave, is a live project and
 * imports as that project's cost plan.
 *
 * Every tab shares the same layout and the same 69-line code list, so the
 * canonical structure (labels, sections, units, divisions, line types) is read
 * from the default template already in the database. A tab only supplies
 * numbers and formulas.
 *
 *   npx tsx scripts/import-cost-sheet.ts <workbook.xlsx>          # report only
 *   npx tsx scripts/import-cost-sheet.ts <workbook.xlsx> --run    # write
 *   npx tsx scripts/import-cost-sheet.ts <workbook.xlsx> --run --replace-project
 *
 * --replace-project is required to overwrite 608 Macon's existing cost lines.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { computeCostPlan, type CostLineInput, type TakeoffInput } from "../src/lib/estimate/formula";

const APPLY = process.argv.includes("--run");
const REPLACE_PROJECT = process.argv.includes("--replace-project");
const WORKBOOK = process.argv.find((a) => a.endsWith(".xlsx"));

/** Tab name -> template name for the four house models. */
const MODEL_TABS: Record<string, string> = {
  AUGUSTA: "The Augusta",
  RIVERWALK: "The Riverwalk",
  "Broad Street": "The Broad Street",
  Savannah: "The Savannah",
};

/** Tab name -> project slug for tabs that are real jobs. */
const PROJECT_TABS: Record<string, string> = {
  "608 Macon ave": "608-macon-ave",
};

/** Takeoff cell -> the key formulas reference. Keys not in the default
 *  template are ignored, which is how the sheet's unused rows drop out. */
const TAKEOFF_CELLS: Record<string, string> = {
  C3: "total_sqft",
  C4: "heated_sqft",
  C5: "second_floor",
  C7: "first_floor",
  C8: "front_porch",
  C9: "back_patio",
  C10: "front_deck",
  C11: "garage",
  C12: "concrete_sqft",
  C13: "bedrooms",
  C14: "bathrooms",
  C15: "tile_floor",
  C16: "tile_walls",
  C17: "kitchen_backsplash",
  C18: "lvt_hardwood",
  C19: "carpet_yd",
  C20: "cabinet_lnft",
  K3: "footer_lnft",
  K4: "footer_yd",
  K5: "slab_yd",
  K6: "house_slab_sqft",
  K7: "patio_sqft",
  K8: "porch_slab_sqft",
  K9: "brick",
  K10: "bb_siding",
  K11: "siding_sq",
  K12: "roofing_sq",
  K13: "windows",
  K14: "exterior_doors",
  K15: "interior_doors",
  K16: "sliders",
  K17: "r13",
  K18: "r38",
  K19: "cabinet_unit_cost",
  O4: "can_lights",
  O5: "flush_led",
  O6: "interior_fans",
  O7: "bath_fans",
  O8: "exterior_fans",
  O9: "exterior_lights",
  O10: "floods",
  O11: "garage_doors",
  O12: "granite_main",
  O14: "hvac_units",
  O15: "gas_drops",
  O16: "plumbing_drops",
  O17: "r19",
  O18: "sheetrock",
};

/** Sheet row -> cost code. Column A is unreliable: row 22 holds a stray
 *  backtick and the pump truck / footers rows carry no code at all. */
const ROW_CODES: Record<number, string> = {
  22: "1.1", 23: "1.2", 24: "1.3", 25: "1.4", 26: "1.5",
  27: "2", 28: "2.1", 29: "2.2", 30: "2.3", 31: "2.4", 32: "2.5", 33: "2.6",
  34: "3",
  35: "4", 36: "4.4", 37: "4.5", 38: "4.1", 39: "4.3", 40: "4.2",
  41: "5.1", 42: "5.15", 43: "5.2", 44: "5.3", 45: "5.4", 46: "5.5",
  47: "7.1", 48: "7.2", 49: "7.3",
  50: "8", 51: "8.1", 52: "8.2", 53: "8.3",
  54: "9.1", 55: "9.2", 56: "9.3", 57: "9.4",
  58: "10", 59: "10.1", 60: "11", 61: "11.1",
  62: "12.1", 63: "12.3", 64: "12.4", 65: "12.5", 66: "12.6",
  67: "14.1", 68: "14.2", 69: "15", 70: "15.1", 71: "16.1", 72: "16.2",
  73: "17", 74: "18",
  75: "21", 76: "21.1", 77: "22",
  78: "23.1", 79: "23.2", 80: "23.4", 81: "23.5", 82: "23.6", 83: "23.7",
  84: "24", 85: "25", 86: "25.1",
  87: "26", 88: "26.1", 89: "32",
  90: "35", 92: "36", 93: "P/O",
};

const SUBTOTAL_CELL = "C91";
const TOTAL_CELL = "C94";

/** Cells that aren't takeoff but do have a name in our expressions. */
const RESERVED_CELLS: Record<string, string> = { [SUBTOTAL_CELL]: "subtotal" };

/* ------------------------------------------------------------------ */

type CellRead = { value: number | null; formula: string | null; unresolved: string[] };

/** Space out operators so imported formulas read like the seeded ones. */
function prettify(expr: string): string {
  return expr
    .replace(/([+\-*/])/g, " $1 ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compare two expressions ignoring whitespace only. */
function sameExpression(a: string, b: string): boolean {
  return a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}

/** Translate an Excel formula into our takeoff-key expression. */
function translateFormula(excel: string): { formula: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const body = excel.replace(/^=/, "");

  const formula = body.replace(/\$?([A-Z]{1,2})\$?(\d+)/g, (match, col, row) => {
    const ref = `${col}${row}`;
    const key = TAKEOFF_CELLS[ref] ?? RESERVED_CELLS[ref];
    if (key) return key;
    unresolved.push(match);
    return match;
  });

  return { formula: prettify(formula), unresolved };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function readCell(ws: ExcelJS.Worksheet, ref: string): CellRead {
  const cell = ws.getCell(ref);
  const raw: any = cell.value;

  if (raw == null) return { value: null, formula: null, unresolved: [] };

  if (typeof raw === "object" && ("formula" in raw || "sharedFormula" in raw)) {
    const result = typeof raw.result === "number" ? raw.result : null;
    // A shared formula's text lives on its master cell; fall back to the value.
    if (!raw.formula) return { value: result, formula: null, unresolved: [] };
    const { formula, unresolved } = translateFormula(String(raw.formula));
    return { value: result, formula, unresolved };
  }

  if (typeof raw === "number") return { value: raw, formula: null, unresolved: [] };
  return { value: null, formula: null, unresolved: [] };
}

function numberAt(ws: ExcelJS.Worksheet, ref: string): number | null {
  return readCell(ws, ref).value;
}

/* ------------------------------------------------------------------ */

type TemplateStructure = {
  takeoff: { key: string; label: string; unit: string | null; formula: string | null; section: string; display_order: number }[];
  lines: {
    code: string; label: string; section: string; division_code: string | null;
    line_type: string; unit: string | null; display_order: number; is_allowance: boolean;
  }[];
};

type TabImport = {
  tab: string;
  takeoffValues: Record<string, number | null>;
  takeoffFormulas: Record<string, string | null>;
  lineFormulas: Record<string, string | null>;
  lineAmounts: Record<string, number | null>;
  lineNotes: Record<string, string | null>;
  sheetSubtotal: number | null;
  sheetTotal: number | null;
  warnings: string[];
};

function readTab(ws: ExcelJS.Worksheet, structure: TemplateStructure): TabImport {
  const warnings: string[] = [];
  const takeoffValues: Record<string, number | null> = {};
  const takeoffFormulas: Record<string, string | null> = {};
  const templateTakeoff = new Map(structure.takeoff.map((t) => [t.key, t]));

  for (const [ref, key] of Object.entries(TAKEOFF_CELLS)) {
    if (!templateTakeoff.has(key)) continue;
    const read = readCell(ws, ref);
    const templated = templateTakeoff.get(key)!;

    // A takeoff formula encodes this model's geometry — The Riverwalk roofs off
    // the second floor, the models with garages fold the garage into the slab.
    // The sheet is the authority; the template is only a fallback.
    // Constant arithmetic like `=1123+821` (no cell refs at all) is this
    // model's tally, not a reusable expression. Keep the number.
    const referencesSomething = read.formula ? /[a-zA-Z_]/.test(read.formula) : false;

    if (read.formula && referencesSomething && read.unresolved.length === 0) {
      takeoffFormulas[key] = read.formula;
      takeoffValues[key] = null;
      if (templated.formula && !sameExpression(read.formula, templated.formula)) {
        warnings.push(`takeoff ${key}: "${read.formula}" (standard is "${templated.formula}")`);
      }
      continue;
    }

    if (read.formula) {
      takeoffFormulas[key] = null;
      takeoffValues[key] = read.value;
      continue;
    }

    // A typed number where the standard derives one is a deliberate override —
    // Broad Street and Savannah pin roofing SQ by hand rather than taking
    // 1.3 x footprint. Keep the number and drop the formula.
    if (read.value != null) {
      takeoffFormulas[key] = null;
      takeoffValues[key] = read.value;
      if (templated.formula) {
        warnings.push(`takeoff ${key}: pinned to ${read.value} (standard derives it from "${templated.formula}")`);
      }
      continue;
    }

    takeoffFormulas[key] = templated.formula;
    takeoffValues[key] = null;
  }

  const lineFormulas: Record<string, string | null> = {};
  const lineAmounts: Record<string, number | null> = {};
  const lineNotes: Record<string, string | null> = {};
  const knownCodes = new Set(structure.lines.map((l) => l.code));

  for (const [rowStr, code] of Object.entries(ROW_CODES)) {
    if (!knownCodes.has(code)) {
      warnings.push(`row ${rowStr}: code "${code}" is not in the template — skipped`);
      continue;
    }
    const row = Number(rowStr);
    const read = readCell(ws, `C${row}`);

    if (read.formula && read.unresolved.length === 0) {
      lineFormulas[code] = read.formula;
      lineAmounts[code] = read.value;
    } else {
      if (read.formula) {
        warnings.push(
          `${code}: formula references ${read.unresolved.join(", ")} outside the takeoff — imported as a flat ${read.value ?? 0}`
        );
      }
      lineFormulas[code] = null;
      lineAmounts[code] = read.value;
    }

    const note = ws.getCell(`I${row}`).value;
    lineNotes[code] = typeof note === "string" && note.trim() ? note.trim() : null;
  }

  return {
    tab: ws.name,
    takeoffValues,
    takeoffFormulas,
    lineFormulas,
    lineAmounts,
    lineNotes,
    sheetSubtotal: numberAt(ws, SUBTOTAL_CELL),
    sheetTotal: numberAt(ws, TOTAL_CELL),
    warnings,
  };
}

/** Re-evaluate what we're about to store and check it against the sheet. */
function verify(tab: TabImport, structure: TemplateStructure) {
  const takeoff: TakeoffInput[] = structure.takeoff.map((t) => ({
    key: t.key,
    value: tab.takeoffValues[t.key] ?? null,
    formula: t.key in tab.takeoffFormulas ? tab.takeoffFormulas[t.key] : t.formula,
  }));

  const lines: CostLineInput[] = structure.lines.map((l) => ({
    id: l.code,
    code: l.code,
    line_type: l.line_type as CostLineInput["line_type"],
    formula: tab.lineFormulas[l.code] ?? null,
    estimated_amount: tab.lineAmounts[l.code] ?? null,
  }));

  const plan = computeCostPlan(lines, takeoff);
  const subtotalDrift = tab.sheetSubtotal == null ? null : plan.subtotal - tab.sheetSubtotal;
  const totalDrift = tab.sheetTotal == null ? null : plan.total - tab.sheetTotal;

  // Which individual lines disagree with the sheet's own computed value.
  const lineDrift = structure.lines
    .filter((l) => l.line_type === "cost")
    .map((l) => {
      const sheet = tab.lineAmounts[l.code];
      const ours = plan.byId[l.code]?.amount;
      if (sheet == null || ours == null) return null;
      const delta = ours - sheet;
      return Math.abs(delta) < 0.01 ? null : { code: l.code, label: l.label, sheet, ours, delta };
    })
    .filter(Boolean) as { code: string; label: string; sheet: number; ours: number; delta: number }[];

  return { plan, subtotalDrift, totalDrift, lineDrift };
}

/* ------------------------------------------------------------------ */

function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const envFile = resolve(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

async function main() {
  if (!WORKBOOK) {
    console.error("Usage: npx tsx scripts/import-cost-sheet.ts <workbook.xlsx> [--run] [--replace-project]");
    process.exit(1);
  }

  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or put them in .env.local)");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: defaultTemplate } = await sb
    .from("cost_code_templates")
    .select("id, name")
    .eq("is_default", true)
    .single();

  if (!defaultTemplate) throw new Error("No default cost code template — run the migration first.");

  const [{ data: takeoffDefs }, { data: lineDefs }] = await Promise.all([
    sb.from("cost_code_template_takeoff")
      .select("key, label, unit, formula, section, display_order")
      .eq("template_id", defaultTemplate.id).order("display_order"),
    sb.from("cost_code_template_lines")
      .select("code, label, section, division_code, line_type, unit, display_order, is_allowance")
      .eq("template_id", defaultTemplate.id).order("display_order"),
  ]);

  const structure: TemplateStructure = {
    takeoff: (takeoffDefs ?? []) as TemplateStructure["takeoff"],
    lines: (lineDefs ?? []) as TemplateStructure["lines"],
  };

  console.log(`Structure from "${defaultTemplate.name}": ${structure.lines.length} lines, ${structure.takeoff.length} takeoff keys`);
  console.log(APPLY ? "\nMode: WRITING\n" : "\nMode: dry run (pass --run to write)\n");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolve(WORKBOOK));

  for (const ws of workbook.worksheets) {
    const templateName = MODEL_TABS[ws.name];
    const projectSlug = PROJECT_TABS[ws.name];
    if (!templateName && !projectSlug) {
      console.log(`— ${ws.name}: not a known model or project, skipped`);
      continue;
    }

    const tab = readTab(ws, structure);
    const { plan, subtotalDrift, totalDrift, lineDrift } = verify(tab, structure);

    const label = templateName ? `template "${templateName}"` : `project ${projectSlug}`;
    console.log(`\n${ws.name} → ${label}`);
    console.log(
      `   subtotal ${plan.subtotal.toFixed(2)} vs sheet ${tab.sheetSubtotal?.toFixed(2) ?? "?"}` +
        (subtotalDrift != null ? `  (${subtotalDrift >= 0 ? "+" : ""}${subtotalDrift.toFixed(2)})` : "")
    );
    console.log(
      `   total    ${plan.total.toFixed(2)} vs sheet ${tab.sheetTotal?.toFixed(2) ?? "?"}` +
        (totalDrift != null ? `  (${totalDrift >= 0 ? "+" : ""}${totalDrift.toFixed(2)})` : "")
    );

    const formulaCount = Object.values(tab.lineFormulas).filter(Boolean).length;
    console.log(`   ${formulaCount} calculated lines`);

    for (const d of lineDrift) {
      console.log(
        `   ✗ ${d.code} ${d.label}: sheet ${d.sheet.toFixed(2)}, ours ${d.ours.toFixed(2)} ` +
          `(${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(2)})`
      );
    }
    for (const w of tab.warnings) console.log(`   ! ${w}`);
    for (const [k, e] of Object.entries(plan.takeoffErrors)) console.log(`   ! takeoff ${k}: ${e}`);
    for (const l of plan.lines.filter((l) => l.error)) console.log(`   ! line ${l.id}: ${l.error}`);

    if (!APPLY) continue;

    if (templateName) await writeTemplate(sb, templateName, ws.name, tab, structure);
    else await writeProject(sb, projectSlug!, tab, structure, plan);
  }

  console.log(APPLY ? "\nDone." : "\nNothing written. Re-run with --run.");
}

async function writeTemplate(
  sb: ReturnType<typeof createClient>,
  name: string,
  tabName: string,
  tab: TabImport,
  structure: TemplateStructure
) {
  const { data: existing } = await sb.from("cost_code_templates").select("id").eq("name", name).maybeSingle();

  let templateId = existing?.id as string | undefined;
  if (templateId) {
    // Replace this template's contents wholesale; it is a copy of a sheet tab.
    await sb.from("cost_code_template_lines").delete().eq("template_id", templateId);
    await sb.from("cost_code_template_takeoff").delete().eq("template_id", templateId);
  } else {
    const { data: created, error } = await sb
      .from("cost_code_templates")
      .insert({ name, description: `Imported from the "${tabName}" tab of Robby's cost workbook.`, is_default: false })
      .select("id")
      .single();
    if (error) throw error;
    templateId = created.id as string;
  }

  const { error: takeoffErr } = await sb.from("cost_code_template_takeoff").insert(
    structure.takeoff.map((t) => ({
      template_id: templateId,
      key: t.key,
      label: t.label,
      unit: t.unit,
      default_value: tab.takeoffValues[t.key] ?? null,
      formula: t.key in tab.takeoffFormulas ? tab.takeoffFormulas[t.key] : t.formula,
      section: t.section,
      display_order: t.display_order,
    }))
  );
  if (takeoffErr) throw takeoffErr;

  const { error: lineErr } = await sb.from("cost_code_template_lines").insert(
    structure.lines.map((l) => ({
      template_id: templateId,
      code: l.code,
      label: l.label,
      section: l.section,
      division_code: l.division_code,
      line_type: l.line_type,
      unit: l.unit,
      formula: tab.lineFormulas[l.code] ?? null,
      default_amount: tab.lineFormulas[l.code] ? null : tab.lineAmounts[l.code] ?? null,
      is_allowance: l.is_allowance,
      display_order: l.display_order,
    }))
  );
  if (lineErr) throw lineErr;

  console.log(`   wrote template ${templateId}`);
}

async function writeProject(
  sb: ReturnType<typeof createClient>,
  slug: string,
  tab: TabImport,
  structure: TemplateStructure,
  plan: ReturnType<typeof computeCostPlan>
) {
  const { data: project } = await sb.from("projects").select("id, title").eq("slug", slug).maybeSingle();
  if (!project) {
    console.log(`   ! no project with slug "${slug}" — skipped`);
    return;
  }

  const { count } = await sb
    .from("project_estimate_lines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  if ((count ?? 0) > 0 && !REPLACE_PROJECT) {
    console.log(`   ! ${project.title} already has ${count} cost lines — pass --replace-project to overwrite`);
    return;
  }

  await sb.from("project_estimate_lines").delete().eq("project_id", project.id);
  await sb.from("project_takeoff_values").delete().eq("project_id", project.id);

  const { error: takeoffErr } = await sb.from("project_takeoff_values").insert(
    structure.takeoff.map((t) => ({
      project_id: project.id,
      key: t.key,
      label: t.label,
      unit: t.unit,
      value: tab.takeoffValues[t.key] ?? null,
      formula: t.key in tab.takeoffFormulas ? tab.takeoffFormulas[t.key] : t.formula,
      section: t.section,
      display_order: t.display_order,
    }))
  );
  if (takeoffErr) throw takeoffErr;

  const { error: lineErr } = await sb.from("project_estimate_lines").insert(
    structure.lines.map((l) => ({
      project_id: project.id,
      code: l.code,
      trade_label: l.label,
      section: l.section,
      division_code: l.division_code ?? "DIV-01",
      line_type: l.line_type,
      unit: l.unit,
      formula: tab.lineFormulas[l.code] ?? null,
      estimated_amount: tab.lineAmounts[l.code] ?? 0,
      notes: tab.lineNotes[l.code] ?? null,
      is_allowance: l.is_allowance,
      display_order: l.display_order,
    }))
  );
  if (lineErr) throw lineErr;

  // heated_sqft and total_sqft are derived keys, so their stored value is null
  // by design — take the resolved numbers off the computed scope.
  const heated = plan.takeoffScope.heated_sqft;
  const totalSqft = plan.takeoffScope.total_sqft;

  await sb
    .from("projects")
    .update({
      estimated_cost: Math.round(plan.total * 100) / 100,
      estimate_updated_at: new Date().toISOString(),
      ...(heated ? { heated_square_footage: Math.round(heated) } : {}),
      ...(totalSqft ? { square_footage: Math.round(totalSqft) } : {}),
    })
    .eq("id", project.id);

  console.log(
    `   wrote ${structure.lines.length} lines to ${project.title} ` +
      `(subtotal ${plan.subtotal.toFixed(2)}, ${Math.round(totalSqft ?? 0)} sqft / ${Math.round(heated ?? 0)} heated)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
