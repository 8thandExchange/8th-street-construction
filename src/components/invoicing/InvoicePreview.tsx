import { SITE_NAME, CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export interface InvoicePreviewLine {
  description: string;
  quantity: number;
  unitAmount: number; // cents
}

export interface InvoicePreviewData {
  customerName: string;
  customerEmail: string | null;
  customerAddress?: string[] | null;
  lineItems: InvoicePreviewLine[];
  subtotal: number; // cents
  total: number; // cents
  /** Resolved due date, or null when invalid. */
  dueDate: Date | null;
  /** True when terms are "due on receipt" (days_until_due === 0). */
  dueOnReceipt: boolean;
  memo?: string;
  footer?: string;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function unitMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  }).format(cents / 100);
}

function longDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * A faithful, brand-styled render of the invoice the customer will receive.
 * Presentational only — no Stripe calls. The official invoice number is
 * assigned by Stripe at finalization, so this shows a "draft" placeholder.
 */
export function InvoicePreview({ data }: { data: InvoicePreviewData }) {
  const issued = new Date();

  return (
    <div className="inv-preview-doc">
      <div className="inv-preview-head">
        <div>
          <div className="inv-preview-brand">{SITE_NAME}</div>
          <div className="inv-preview-brand-meta">
            {CONTACT_EMAIL}
            <br />
            {SITE_URL.replace(/^https?:\/\//, "")}
          </div>
        </div>
        <div className="inv-preview-head-right">
          <div className="inv-preview-doctype">Invoice</div>
          <div className="inv-preview-number">Number assigned on send</div>
        </div>
      </div>

      <div className="inv-preview-meta-grid">
        <div>
          <div className="inv-preview-meta-label">Bill to</div>
          <div className="inv-preview-meta-strong">{data.customerName}</div>
          {data.customerEmail ? (
            <div className="inv-preview-meta-line">{data.customerEmail}</div>
          ) : null}
          {data.customerAddress?.map((line, i) => (
            <div key={i} className="inv-preview-meta-line">
              {line}
            </div>
          ))}
        </div>
        <div className="inv-preview-meta-right">
          <div className="inv-preview-meta-row">
            <span className="inv-preview-meta-label">Issued</span>
            <span>{longDate(issued)}</span>
          </div>
          <div className="inv-preview-meta-row">
            <span className="inv-preview-meta-label">Due</span>
            <span>
              {data.dueOnReceipt
                ? "On receipt"
                : data.dueDate
                  ? longDate(data.dueDate)
                  : "—"}
            </span>
          </div>
        </div>
      </div>

      <table className="inv-preview-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="inv-preview-num">Qty</th>
            <th className="inv-preview-num">Rate</th>
            <th className="inv-preview-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((line, i) => (
            <tr key={i}>
              <td>{line.description || <span className="inv-preview-empty">No description</span>}</td>
              <td className="inv-preview-num">{line.quantity.toLocaleString()}</td>
              <td className="inv-preview-num">{unitMoney(line.unitAmount)}</td>
              <td className="inv-preview-num">{money(line.unitAmount * line.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-preview-totals">
        <div className="inv-preview-total-row">
          <span>Subtotal</span>
          <span>{money(data.subtotal)}</span>
        </div>
        <div className="inv-preview-total-row inv-preview-total-grand">
          <span>Total due</span>
          <span>{money(data.total)}</span>
        </div>
      </div>

      {data.memo ? (
        <div className="inv-preview-note">
          <div className="inv-preview-meta-label">Memo</div>
          <p>{data.memo}</p>
        </div>
      ) : null}

      <div className="inv-preview-foot">
        {data.footer ? <p>{data.footer}</p> : null}
        <p className="inv-preview-foot-pay">
          Payable online by US bank transfer (ACH) via the secure link in your email.
        </p>
      </div>
    </div>
  );
}
