"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Trash2, Plus, FunctionSquare, AlertTriangle } from "lucide-react";
import { formatMoney } from "@/lib/billing/constants";
import {
  updateCostLine,
  updateTakeoffValue,
  addCostLine,
  deleteCostLine,
  type SerializedTotals,
} from "@/lib/actions/cost-plan";
import type { CostPlanLine, TakeoffValue, LineRollup, LineAttribution, LineQuotes } from "@/lib/estimate/cost-plan";
import { EMPTY_ROLLUP, EMPTY_QUOTES, groupLinesBySection } from "@/lib/estimate/cost-plan";

/* ------------------------------------------------------------------ */
/* Editable cell — autosave on blur. No save button; Robby would        */
/* forget it. Enter commits and drops focus, Escape reverts.            */
/* ------------------------------------------------------------------ */

function EditableCell({
  value,
  onCommit,
  align = "left",
  mono = false,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  align?: "left" | "right";
  mono?: boolean;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const committed = useRef(value);

  // Adopt server-side changes, but never yank the text out from under a
  // cursor that's mid-edit. Effect, not render — this also runs during SSR.
  useEffect(() => {
    if (focused) return;
    committed.current = value;
    setDraft(value);
  }, [value, focused]);

  return (
    <input
      aria-label={ariaLabel}
      value={draft}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (draft === committed.current) return;
        committed.current = draft;
        onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(committed.current);
          e.currentTarget.blur();
        }
      }}
      className={[
        "w-full bg-transparent px-2 py-1.5 text-sm rounded-sm",
        "border border-transparent hover:border-ink/15 focus:border-copper focus:bg-paper",
        "focus:outline-none transition-colors",
        align === "right" ? "text-right" : "",
        mono ? "font-mono tabular-nums" : "",
      ].join(" ")}
    />
  );
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Where a line stands, at a glance. */
function statusOf(budget: number, r: LineRollup): { tone: string; title: string } {
  const spent = Math.max(r.committed, r.actual);
  if (budget > 0 && spent > budget + 0.005) {
    return { tone: "bg-red-600", title: `Over by ${formatMoney(spent - budget)}` };
  }
  if (r.actual > 0) return { tone: "bg-emerald-600", title: "Billed by a vendor" };
  if (r.committed > 0) return { tone: "bg-sky-500", title: "Committed on a PO" };
  return { tone: "bg-ink/15", title: "Not started" };
}

/* ------------------------------------------------------------------ */

type Props = {
  projectId: string;
  lines: CostPlanLine[];
  takeoff: TakeoffValue[];
  totals: SerializedTotals;
  rollup: Record<string, LineRollup>;
  quotes: Record<string, LineQuotes>;
  attribution: Record<string, LineAttribution[]>;
};

export function BudgetGrid({ projectId, lines, takeoff, totals: initialTotals, rollup, quotes, attribution }: Props) {
  const [totals, setTotals] = useState(initialTotals);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showTakeoff, setShowTakeoff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The grid recomputes budgets locally as you type; rollups come from the
  // server, so they stay as loaded until the page revalidates.
  useEffect(() => setTotals(initialTotals), [initialTotals]);

  const costLines = useMemo(() => lines.filter((l) => l.line_type === "cost"), [lines]);
  const markupLines = useMemo(() => lines.filter((l) => l.line_type !== "cost"), [lines]);
  const sections = useMemo(() => groupLinesBySection(costLines), [costLines]);

  const amountOf = useCallback(
    (line: CostPlanLine) => totals.byId[line.id]?.amount ?? Number(line.estimated_amount ?? 0),
    [totals]
  );
  const rollupOf = useCallback((line: CostPlanLine) => rollup[line.id] ?? EMPTY_ROLLUP, [rollup]);
  const quotesOf = useCallback((line: CostPlanLine) => quotes[line.id] ?? EMPTY_QUOTES, [quotes]);

  const spend = useMemo(() => {
    let committed = 0;
    let actual = 0;
    let billed = 0;
    let quoted = 0;
    for (const line of costLines) {
      const r = rollupOf(line);
      committed += r.committed;
      actual += r.actual;
      billed += r.billed;
      const q = quotesOf(line);
      quoted += q.awarded ?? q.low ?? 0;
    }
    return { committed, actual, billed, quoted };
  }, [costLines, rollupOf, quotesOf]);

  const run = useCallback(
    (fn: () => Promise<{ ok: true; totals: SerializedTotals } | { ok: false; error: string }>) => {
      startTransition(async () => {
        const result = await fn();
        if (result.ok) {
          setTotals(result.totals);
          setError(null);
          setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
        } else {
          setError(result.error);
        }
      });
    },
    []
  );

  function toggle(set: Set<string>, key: string, apply: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTakeoff((v) => !v)}
            className="app-btn app-btn-secondary !py-1.5 !text-xs"
          >
            {showTakeoff ? "Hide takeoff" : "Show takeoff"}
          </button>
          <span className="text-xs text-ink/45">
            {costLines.length} lines · {costLines.filter((l) => l.formula).length} calculated
          </span>
        </div>
        <div className="text-xs text-ink/45 min-h-[1rem]" aria-live="polite">
          {pending ? "Saving…" : savedAt ? `Saved ${savedAt}` : null}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showTakeoff && (
        <TakeoffPanel
          projectId={projectId}
          takeoff={takeoff}
          scope={totals.takeoffScope}
          errors={totals.takeoffErrors}
          run={run}
        />
      )}

      <div className="border border-ink/10 overflow-x-auto">
        <table className="app-table w-full min-w-[1080px]">
          <thead>
            <tr className="bg-bone/60 text-left app-label">
              <th className="px-3 py-3 w-20">Code</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-right w-28">Budget</th>
              <th className="px-3 py-3 text-right w-28">Quote</th>
              <th className="px-3 py-3 text-right w-28">Committed</th>
              <th className="px-3 py-3 text-right w-28">Actual</th>
              <th className="px-3 py-3 text-right w-28">Billed</th>
              <th className="px-3 py-3 text-right w-28">Remaining</th>
              <th className="px-2 py-3 w-8" aria-label="Status" />
            </tr>
          </thead>

          {sections.map((group) => {
            const collapsed = collapsedSections.has(group.section);
            const sectionBudget = group.lines.reduce((s, l) => s + amountOf(l), 0);
            const sectionCommitted = group.lines.reduce((s, l) => s + rollupOf(l).committed, 0);
            const sectionActual = group.lines.reduce((s, l) => s + rollupOf(l).actual, 0);
            const sectionBilled = group.lines.reduce((s, l) => s + rollupOf(l).billed, 0);
            const sectionQuoted = group.lines.reduce((s, l) => {
              const q = quotesOf(l);
              return s + (q.awarded ?? q.low ?? 0);
            }, 0);
            const sectionRemaining = sectionBudget - Math.max(sectionCommitted, sectionActual);
            const lastOrder = group.lines[group.lines.length - 1]?.display_order ?? 0;

            return (
              <tbody key={group.section} className="divide-y divide-ink/8">
                <tr className="bg-bone/30">
                  <td colSpan={2} className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggle(collapsedSections, group.section, setCollapsedSections)}
                      className="flex items-center gap-1.5 app-label !text-ink/70 hover:!text-copper"
                      aria-expanded={!collapsed}
                    >
                      {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {group.section}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-ink/70">
                    {formatMoney(sectionBudget)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-ink/45">
                    {sectionQuoted ? formatMoney(sectionQuoted) : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-ink/45">
                    {sectionCommitted ? formatMoney(sectionCommitted) : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-ink/45">
                    {sectionActual ? formatMoney(sectionActual) : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-ink/45">
                    {sectionBilled ? formatMoney(sectionBilled) : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-ink/45">
                    {formatMoney(sectionRemaining)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      title={`Add a line to ${group.section}`}
                      aria-label={`Add a line to ${group.section}`}
                      onClick={() =>
                        run(() => addCostLine({ projectId, section: group.section, afterDisplayOrder: lastOrder }))
                      }
                      className="text-ink/35 hover:text-copper p-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {!collapsed &&
                  group.lines.map((line) => {
                    const computed = totals.byId[line.id];
                    const amount = amountOf(line);
                    const r = rollupOf(line);
                    const derived = Boolean(line.formula);
                    const isOpen = expanded.has(line.id);
                    const remaining = amount - Math.max(r.committed, r.actual);
                    const status = statusOf(amount, r);
                    const records = attribution[line.id] ?? [];
                    const quote = line.awarded_amount == null ? null : Number(line.awarded_amount);
                    const q = quotesOf(line);
                    const quoteFigure = q.awarded ?? q.low;
                    // Only meaningful against a budget that has been set.
                    const quoteOver = amount > 0 && quoteFigure != null && quoteFigure > amount + 0.005;
                    const quoteTitle = [
                      q.awardedTo ? `Awarded to ${q.awardedTo}` : null,
                      q.awarded == null && q.count > 0
                        ? `${q.count} quote${q.count === 1 ? "" : "s"} in, none awarded`
                        : null,
                      quoteOver ? `${formatMoney(quoteFigure! - amount)} over budget` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined;

                    return (
                      <Fragment key={line.id}>
                        <tr className="bg-paper align-middle">
                          <td className="px-3 py-1">
                            <button
                              type="button"
                              onClick={() => toggle(expanded, line.id, setExpanded)}
                              aria-expanded={isOpen}
                              aria-label={`Details for ${line.code ?? line.trade_label}`}
                              className="font-mono text-xs text-ink/55 hover:text-copper"
                            >
                              {line.code ?? "—"}
                            </button>
                          </td>

                          <td className="px-1 py-1">
                            <div className="flex items-center gap-1.5">
                              <EditableCell
                                ariaLabel={`Description for ${line.code ?? line.id}`}
                                value={line.trade_label}
                                onCommit={(next) =>
                                  run(() => updateCostLine({ projectId, lineId: line.id, patch: { trade_label: next } }))
                                }
                              />
                              {line.is_allowance && (
                                <span className="shrink-0 text-[10px] uppercase tracking-wide text-copper/80 border border-copper/30 px-1.5 py-0.5">
                                  Allow
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-1 py-1">
                            {derived ? (
                              <button
                                type="button"
                                onClick={() => toggle(expanded, line.id, setExpanded)}
                                title={line.formula ?? undefined}
                                className="w-full flex items-center justify-end gap-1.5 px-2 py-1.5 text-sm font-mono tabular-nums hover:text-copper"
                              >
                                <FunctionSquare className="w-3 h-3 text-copper/60" />
                                {formatMoney(amount)}
                              </button>
                            ) : (
                              <EditableCell
                                ariaLabel={`Budget for ${line.code ?? line.id}`}
                                value={line.estimated_amount == null ? "" : String(line.estimated_amount)}
                                align="right"
                                mono
                                placeholder="—"
                                onCommit={(next) => {
                                  const parsed = parseMoney(next);
                                  if (Number.isNaN(parsed)) {
                                    setError(`"${next}" isn't a number.`);
                                    return;
                                  }
                                  run(() =>
                                    updateCostLine({ projectId, lineId: line.id, patch: { estimated_amount: parsed } })
                                  );
                                }}
                              />
                            )}
                          </td>

                          {/* Quote. An awarded number is what we are held to,
                              so it reads solid; a low bid with nothing awarded
                              is still moving, so it reads muted with the count
                              of quotes behind it. Over budget is flagged here
                              rather than after the money is spent. */}
                          <td
                            className={[
                              "px-3 py-1 text-right font-mono tabular-nums text-sm",
                              q.awarded != null ? "text-ink/70" : "text-ink/45",
                              quoteOver ? "text-red-700" : "",
                            ].join(" ")}
                            title={quoteTitle}
                          >
                            {q.awarded != null ? (
                              formatMoney(q.awarded)
                            ) : q.low != null ? (
                              <span className="inline-flex items-center gap-1 justify-end">
                                {formatMoney(q.low)}
                                {q.count > 1 && (
                                  <span className="text-[10px] text-ink/35">×{q.count}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-ink/25">—</span>
                            )}
                          </td>

                          <td
                            className="px-3 py-1 text-right font-mono tabular-nums text-sm text-ink/70"
                            title={r.po_count ? `${r.po_count} purchase order(s)` : undefined}
                          >
                            {r.committed ? formatMoney(r.committed) : <span className="text-ink/25">—</span>}
                          </td>

                          <td
                            className="px-3 py-1 text-right font-mono tabular-nums text-sm text-ink/70"
                            title={r.bill_count ? `${r.bill_count} vendor bill(s)` : undefined}
                          >
                            {r.actual ? formatMoney(r.actual) : <span className="text-ink/25">—</span>}
                          </td>

                          <td
                            className="px-3 py-1 text-right font-mono tabular-nums text-sm text-ink/70"
                            title={r.invoice_count ? `${r.invoice_count} invoice line(s)` : undefined}
                          >
                            {r.billed ? formatMoney(r.billed) : <span className="text-ink/25">—</span>}
                          </td>

                          <td
                            className={[
                              "px-3 py-1 text-right font-mono tabular-nums text-sm",
                              remaining < -0.005 ? "text-red-700 font-medium" : "text-ink/70",
                            ].join(" ")}
                          >
                            {formatMoney(remaining)}
                          </td>

                          <td className="px-2 py-1">
                            <span
                              className={`block w-2 h-2 rounded-full ${status.tone}`}
                              title={status.title}
                              aria-label={status.title}
                            />
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-bone/20">
                            <td />
                            <td colSpan={8} className="px-3 py-4">
                              <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
                                <div>
                                  <label className="field-label">Formula</label>
                                  <EditableCell
                                    ariaLabel={`Formula for ${line.code ?? line.id}`}
                                    value={line.formula ?? ""}
                                    mono
                                    placeholder="e.g. heated_sqft * 3 — leave blank to type an amount"
                                    onCommit={(next) =>
                                      run(() =>
                                        updateCostLine({ projectId, lineId: line.id, patch: { formula: next } })
                                      )
                                    }
                                  />
                                  {computed?.error && <p className="text-xs text-red-700 mt-1">{computed.error}</p>}
                                  {line.unit && <p className="text-xs text-ink/45 mt-1">Priced per {line.unit}</p>}
                                </div>

                                <div>
                                  <label className="field-label">Notes</label>
                                  <EditableCell
                                    ariaLabel={`Notes for ${line.code ?? line.id}`}
                                    value={line.notes ?? ""}
                                    placeholder="Quoted by…"
                                    onCommit={(next) =>
                                      run(() => updateCostLine({ projectId, lineId: line.id, patch: { notes: next } }))
                                    }
                                  />
                                </div>

                                {(records.length > 0 || quote != null) && (
                                  <div className="md:col-span-2">
                                    <div className="app-label mb-2">Money on this line</div>
                                    <ul className="text-sm divide-y divide-ink/8 border-t border-ink/8">
                                      {quote != null && (
                                        <li className="flex items-center gap-3 py-1.5">
                                          <span className="text-[10px] uppercase tracking-wide text-ink/40 w-16">
                                            Quote
                                          </span>
                                          <span className="flex-1 text-ink/70">Awarded sub bid</span>
                                          <span className="font-mono tabular-nums">{formatMoney(quote)}</span>
                                        </li>
                                      )}
                                      {records.map((rec) => (
                                        <li key={`${rec.kind}-${rec.id}`} className="flex items-center gap-3 py-1.5">
                                          <span className="text-[10px] uppercase tracking-wide text-ink/40 w-16">
                                            {rec.kind === "po" ? "PO" : rec.kind === "bill" ? "Bill" : "Billed"}
                                          </span>
                                          <span className="flex-1 text-ink/70 truncate" title={rec.label}>
                                            {rec.label}
                                          </span>
                                          {rec.reference && (
                                            <span className="font-mono text-[11px] text-ink/40">{rec.reference}</span>
                                          )}
                                          <span className="font-mono tabular-nums">{formatMoney(rec.amount)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="flex items-center gap-4 md:col-span-2">
                                  <label className="flex items-center gap-2 text-sm text-ink/70">
                                    <input
                                      type="checkbox"
                                      defaultChecked={line.is_allowance}
                                      onChange={(e) =>
                                        run(() =>
                                          updateCostLine({
                                            projectId,
                                            lineId: line.id,
                                            patch: { is_allowance: e.target.checked },
                                          })
                                        )
                                      }
                                    />
                                    Allowance
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => run(() => deleteCostLine({ projectId, lineId: line.id }))}
                                    className="flex items-center gap-1.5 text-xs text-red-700 hover:underline"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete line
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            );
          })}

          <tfoot className="border-t-2 border-ink/15">
            <tr className="bg-bone/40 font-medium">
              <td colSpan={2} className="px-3 py-3">
                Subtotal
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMoney(totals.subtotal)}</td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {spend.quoted ? formatMoney(spend.quoted) : "—"}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {spend.committed ? formatMoney(spend.committed) : "—"}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {spend.actual ? formatMoney(spend.actual) : "—"}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {spend.billed ? formatMoney(spend.billed) : "—"}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {formatMoney(totals.subtotal - Math.max(spend.committed, spend.actual))}
              </td>
              <td />
            </tr>

            {markupLines.map((line) => {
              const amount = totals.byId[line.id]?.amount ?? Number(line.estimated_amount ?? 0);
              const isZeroContingency = line.line_type === "contingency" && amount === 0;
              return (
                <tr key={line.id} className="bg-paper">
                  <td className="px-3 py-2 font-mono text-xs text-ink/55">{line.code ?? "—"}</td>
                  <td className="px-3 py-2 text-sm">
                    <span>{line.trade_label}</span>
                    {line.formula && <span className="ml-2 text-xs text-ink/40 font-mono">{line.formula}</span>}
                    {isZeroContingency && (
                      <span className="ml-2 text-xs text-amber-700">no contingency held on this job</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sm">{formatMoney(amount)}</td>
                  <td colSpan={6} />
                </tr>
              );
            })}

            <tr className="bg-bone/60 font-semibold border-t border-ink/15">
              <td colSpan={2} className="px-3 py-3">
                Total Build Cost
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMoney(totals.total)}</td>
              <td colSpan={6} className="px-3 py-3 text-right text-xs font-normal text-ink/55">
                {totals.perSqft != null && <span>{formatMoney(totals.perSqft)}/sqft</span>}
                {totals.perHeatedSqft != null && (
                  <span className="ml-3">{formatMoney(totals.perHeatedSqft)}/heated sqft</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TakeoffPanel({
  projectId,
  takeoff,
  scope,
  errors,
  run,
}: {
  projectId: string;
  takeoff: TakeoffValue[];
  scope: Record<string, number>;
  errors: Record<string, string>;
  run: (fn: () => Promise<{ ok: true; totals: SerializedTotals } | { ok: false; error: string }>) => void;
}) {
  const sections = useMemo(() => {
    const map = new Map<string, TakeoffValue[]>();
    for (const t of takeoff) {
      const list = map.get(t.section) ?? [];
      list.push(t);
      map.set(t.section, list);
    }
    return [...map.entries()];
  }, [takeoff]);

  if (!takeoff.length) return null;

  return (
    <div className="hub-panel p-5 mb-6">
      <h3 className="eyebrow mb-1">Takeoff</h3>
      <p className="text-sm text-ink/55 mb-5">
        The quantities the calculated lines are priced from. Change one and every line using it re-figures.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {sections.map(([section, values]) => (
          <div key={section}>
            <div className="app-label mb-2">{section}</div>
            <div className="space-y-0.5">
              {values.map((t) => {
                const derived = Boolean(t.formula);
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-ink/70 truncate" title={t.key}>
                      {t.label}
                      {t.unit && <span className="text-ink/35 ml-1 text-xs">({t.unit})</span>}
                    </span>
                    {derived ? (
                      <span
                        className="w-24 text-right text-sm font-mono tabular-nums text-ink/50 px-2 py-1.5"
                        title={`= ${t.formula}`}
                      >
                        {scope[t.key] == null ? "—" : Number(scope[t.key].toFixed(2)).toLocaleString()}
                      </span>
                    ) : (
                      <div className="w-24">
                        <EditableCell
                          ariaLabel={`Takeoff ${t.key}`}
                          value={t.value == null ? "" : String(t.value)}
                          align="right"
                          mono
                          placeholder="—"
                          onCommit={(next) => {
                            const parsed = parseMoney(next);
                            if (Number.isNaN(parsed)) return;
                            run(() => updateTakeoffValue({ projectId, takeoffId: t.id, patch: { value: parsed } }));
                          }}
                        />
                      </div>
                    )}
                    {errors[t.key] && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
