import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

/** First and last day of the previous month — the range a bookkeeper usually wants. */
function defaultRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(first), to: iso(last) };
}

const EXPORTS = [
  {
    report: "invoices",
    title: "Invoices → QuickBooks",
    blurb:
      "Every sent invoice with its line items, in the exact CSV format QuickBooks Online imports. One file, one click, books up to date.",
    button: "Download invoices CSV",
  },
  {
    report: "payments",
    title: "Payments received",
    blurb:
      "Who paid, when, how much, and how (Mercury ACH vs card) — for matching deposits against the bank feed.",
    button: "Download payments CSV",
  },
  {
    report: "purchase-orders",
    title: "Committed costs (purchase orders)",
    blurb:
      "Every purchase order with vendor, job, and cost division — what you owe subs before the bills land.",
    button: "Download committed-costs CSV",
  },
] as const;

export default async function AccountingPage() {
  const supabase = await createClient();
  const { from, to } = defaultRange();

  const [{ data: invoices }, { data: pos }] = await Promise.all([
    supabase.from("invoices").select("status, total, amount_paid"),
    supabase.from("purchase_orders").select("status, total"),
  ]);

  const invoiced = (invoices ?? [])
    .filter((i) => i.status !== "draft" && i.status !== "void")
    .reduce((s, i) => s + Number(i.total), 0);
  const collected = (invoices ?? []).reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const committed = (pos ?? [])
    .filter((p) => ["issued", "billed", "closed"].includes(p.status))
    .reduce((s, p) => s + Number(p.total), 0);

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl">
      <span className="eyebrow">— Books</span>
      <h1 className="mt-2 app-h1">Accounting</h1>
      <p className="mt-3 app-muted max-w-2xl leading-relaxed">
        Everything your bookkeeper needs, exported straight from the live books. The invoice file
        imports directly into QuickBooks Online; the others match deposits and committed costs.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { label: "Invoiced (all time)", value: formatMoney(invoiced) },
          { label: "Collected", value: formatMoney(collected) },
          { label: "Committed to subs", value: formatMoney(committed) },
        ].map((card) => (
          <div key={card.label} className="app-card p-4">
            <p className="app-label">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-navy tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {EXPORTS.map((exp) => (
          <form
            key={exp.report}
            method="GET"
            action={`/api/accounting/export/${exp.report}`}
            className="app-card p-6"
          >
            <h2 className="app-h2 !text-[16px]">{exp.title}</h2>
            <p className="mt-1 text-sm app-muted max-w-xl">{exp.blurb}</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="app-label mb-1.5 block">From</label>
                <input type="date" name="from" defaultValue={from} />
              </div>
              <div>
                <label className="app-label mb-1.5 block">To</label>
                <input type="date" name="to" defaultValue={to} />
              </div>
              <button type="submit" className="app-btn app-btn-primary">
                {exp.button}
              </button>
            </div>
          </form>
        ))}
      </div>

      <div className="mt-8 app-card p-6">
        <h2 className="app-h2 !text-[16px]">How to import invoices into QuickBooks Online</h2>
        <ol className="mt-3 space-y-2 text-sm text-navy/80 list-decimal list-inside">
          <li>Download the invoices CSV above for the month you're closing.</li>
          <li>
            In QuickBooks, click the <strong>gear icon → Import data → Invoices</strong>.
          </li>
          <li>Upload the file. QuickBooks will match the columns automatically — click Next.</li>
          <li>
            Tick <strong>"Add new customers"</strong> so new clients are created, then Import.
          </li>
        </ol>
        <p className="mt-4 text-sm app-muted max-w-2xl">
          Want invoices to appear in QuickBooks automatically, without the monthly download? That
          takes a free Intuit developer app connected to your QuickBooks account — a one-time
          setup we can wire up whenever you're ready.
        </p>
      </div>
    </div>
  );
}
