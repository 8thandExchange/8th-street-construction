/**
 * The cost plan as a sheet Robby can print, write on, and hand back.
 *
 * Every line prints its code, because the code is what makes the round trip
 * work: a photo of a marked-up sheet is matched back to the digital plan by
 * code, not by row position. Sections stay in workbook order so the paper
 * reads the way his spreadsheet always has.
 */
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadCostPlan } from "@/lib/estimate/cost-plan";
import { formatMoney } from "@/lib/billing/constants";
import { PrintButton } from "@/components/costs/PrintButton";

export const dynamic = "force-dynamic";

/** Sections in the order the plan stores them, each with its own lines. */
function groupBySection<T extends { section: string | null }>(lines: T[]) {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const line of lines) {
    const key = line.section ?? "Other";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(line);
  }
  return order.map((section) => ({ section, lines: map.get(section)! }));
}

export default async function CostPlanPrintPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug, estimated_cost, contract_value, estimate_notes, square_footage, heated_square_footage, street_address")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { lines, totals, rollup, uncoded } = await loadCostPlan(supabase, id, project);

  // Money invoiced to the client that isn't tied to a cost line yet. Without
  // saying so, an empty Billed column reads as "nothing has been billed".
  const uncodedBilled = uncoded.invoiceLines.reduce((sum, l) => sum + l.amount, 0);
  const uncodedBills = uncoded.bills.reduce((sum, b) => sum + (b.amount - b.allocated), 0);

  const costLines = lines.filter((l) => l.line_type === "cost");
  const markupLines = lines.filter((l) => l.line_type !== "cost");
  const sections = groupBySection(costLines);

  const printedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const amountOf = (lineId: string, fallback: number | null) =>
    totals.byId[lineId]?.amount ?? Number(fallback ?? 0);

  return (
    <div className="cost-sheet">
      {/* Screen-only chrome — never printed. */}
      <div className="no-print flex items-center gap-4 mb-6">
        <Link href={`/admin/projects/${id}/costs`} className="app-btn">
          ← Back to cost plan
        </Link>
        <PrintButton />
        <span className="text-sm text-ink/55">
          Print this, write on it, then photograph it to bring the numbers back in.
        </span>
      </div>

      <header className="sheet-header">
        <div>
          <h1>{project.title}</h1>
          {project.street_address && <p className="addr">{project.street_address}</p>}
        </div>
        <div className="meta">
          <div>
            <span className="meta-label">Printed</span> {printedOn}
          </div>
          <div>
            <span className="meta-label">Filled in by</span>{" "}
            <span className="write-line" />
          </div>
        </div>
      </header>

      <p className="how-to">
        Write the <strong>actual cost</strong> in the blank money column as bills come in. Tick{" "}
        <strong>Done</strong> when a trade is closed out. To change a budget, cross out the printed
        number and write the new one beside it. Anything else goes in <strong>Notes</strong>.
      </p>

      {(uncodedBilled > 0 || uncodedBills > 0) && (
        <p className="uncoded-note">
          <strong>Not yet on any line below.</strong>{" "}
          {uncodedBilled > 0 && <>Billed to the client: {formatMoney(uncodedBilled)}. </>}
          {uncodedBills > 0 && <>Paid to vendors: {formatMoney(uncodedBills)}. </>}
          This money is recorded against the job but hasn&apos;t been assigned a cost code, so it is
          missing from the columns below.
        </p>
      )}

      <table className="sheet-table">
        <thead>
          <tr>
            <th className="c-code">Code</th>
            <th className="c-desc">Description</th>
            <th className="c-money">Budget</th>
            <th className="c-money">Billed</th>
            <th className="c-money">Actual</th>
            <th className="c-done">Done</th>
            <th className="c-notes">Notes</th>
          </tr>
        </thead>

        {sections.map((group) => {
          const sectionBudget = group.lines.reduce(
            (sum, l) => sum + amountOf(l.id, l.estimated_amount),
            0
          );

          return (
            <tbody key={group.section}>
              <tr className="section-row">
                <td colSpan={2}>{group.section}</td>
                <td className="c-money">{formatMoney(sectionBudget)}</td>
                <td colSpan={4} />
              </tr>

              {group.lines.map((line) => {
                const budget = amountOf(line.id, line.estimated_amount);
                const spent = rollup[line.id]?.actual ?? 0;
                const invoiced = rollup[line.id]?.billed ?? 0;

                return (
                  <tr key={line.id}>
                    <td className="c-code">{line.code ?? "—"}</td>
                    <td className="c-desc">
                      {line.trade_label}
                      {line.is_allowance && <span className="tag">ALLOW</span>}
                    </td>
                    <td className="c-money">{formatMoney(budget)}</td>
                    {/* What the client has been invoiced for this line —
                        printed for reference, not written on. */}
                    <td className="c-money">{invoiced ? formatMoney(invoiced) : ""}</td>
                    {/* Pre-fill what the system already knows so he isn't
                        re-copying numbers that are already recorded. */}
                    <td className="c-money written">{spent ? formatMoney(spent) : ""}</td>
                    <td className="c-done">
                      <span className="box" />
                    </td>
                    <td className="c-notes" />
                  </tr>
                );
              })}
            </tbody>
          );
        })}

        <tfoot>
          <tr className="total-row">
            <td colSpan={2}>Subtotal</td>
            <td className="c-money">{formatMoney(totals.subtotal)}</td>
            <td colSpan={4} />
          </tr>
          {markupLines.map((line) => (
            <tr key={line.id}>
              <td className="c-code">{line.code ?? "—"}</td>
              <td className="c-desc">{line.trade_label}</td>
              <td className="c-money">{formatMoney(amountOf(line.id, line.estimated_amount))}</td>
              <td colSpan={4} />
            </tr>
          ))}
          <tr className="total-row grand">
            <td colSpan={2}>Total Build Cost</td>
            <td className="c-money">{formatMoney(totals.total)}</td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>

      <p className="footer-note">
        {project.title} · cost plan printed {printedOn} · {costLines.length} lines
      </p>
    </div>
  );
}
