import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

/**
 * Branded vendor invoice — mirrors the vendor's own template layout
 * (BILL TO / FOR, line items, total, remit block) with their crest.
 */

export type VendorBillPdfData = {
  vendorName: string;
  vendorAddress: string | null;
  vendorEmail: string | null;
  logoUrl: string | null;
  billNumber: string | null;
  title: string;
  issuedDate: string | null;
  dueDate: string | null;
  projectLabel: string | null;
  lines: { description: string; amount: number }[];
  total: number;
  remit: {
    accountName: string | null;
    accountNumber: string | null;
    routingNumber: string | null;
    accountType: string | null;
  };
  paid: boolean;
};

const INK = "#1a1a18";
const BURGUNDY = "#7a2334";
const GOLD = "#c9a227";
const MUTED = "#6b645a";
const GRID = "#e0ddd6";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (s: string | null) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: INK },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 96, height: 76, objectFit: "contain" },
  vendorName: { fontFamily: "Helvetica-Bold", fontSize: 15, color: INK },
  muted: { color: MUTED, fontSize: 9.5, lineHeight: 1.5 },
  invoiceTag: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 2.5,
    color: BURGUNDY,
    textTransform: "uppercase",
    textAlign: "right",
  },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 17, marginTop: 2, textAlign: "right" },
  section: { marginTop: 26, flexDirection: "row", justifyContent: "space-between" },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.5,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  table: { marginTop: 26, borderTopWidth: 1.5, borderTopColor: INK },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 0.75,
    borderBottomColor: GRID,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderTopWidth: 1.5,
    borderTopColor: INK,
    marginTop: 2,
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 13, color: BURGUNDY },
  remit: {
    marginTop: 30,
    padding: 14,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 4,
  },
  paidBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: BURGUNDY,
    color: BURGUNDY,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 3,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  footer: { marginTop: 28, fontSize: 9, color: MUTED, lineHeight: 1.6 },
  thanks: {
    marginTop: 18,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
    color: INK,
  },
});

export function vendorBillPdf(data: VendorBillPdfData) {
  return (
    <Document title={`${data.vendorName} — ${data.billNumber ?? data.title}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", gap: 14 }}>
            {data.logoUrl ? <Image src={data.logoUrl} style={styles.logo} /> : null}
            <View style={{ justifyContent: "center" }}>
              <Text style={styles.vendorName}>{data.vendorName}</Text>
              {data.vendorAddress ? (
                <Text style={styles.muted}>{data.vendorAddress}</Text>
              ) : null}
              {data.vendorEmail ? <Text style={styles.muted}>{data.vendorEmail}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTag}>Invoice</Text>
            {data.billNumber ? <Text style={styles.h1}>{data.billNumber}</Text> : null}
            {fmtDate(data.issuedDate) ? (
              <Text style={[styles.muted, { textAlign: "right", marginTop: 4 }]}>
                {fmtDate(data.issuedDate)}
              </Text>
            ) : null}
            {fmtDate(data.dueDate) ? (
              <Text style={[styles.muted, { textAlign: "right" }]}>
                Due {fmtDate(data.dueDate)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View>
            <Text style={styles.label}>Bill To</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>8th Street Construction</Text>
            <Text style={styles.muted}>Accounts Payable</Text>
            <Text style={styles.muted}>32 8th Street</Text>
            <Text style={styles.muted}>Augusta, GA 30901</Text>
          </View>
          <View style={{ maxWidth: 220 }}>
            <Text style={styles.label}>For</Text>
            <Text>{data.projectLabel ?? data.title}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {data.lines.map((line, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={{ maxWidth: 380 }}>{line.description}</Text>
              <Text>{money(line.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL DUE</Text>
            <Text style={styles.totalValue}>{money(data.total)}</Text>
          </View>
        </View>

        {data.paid ? <Text style={styles.paidBadge}>PAID</Text> : null}

        {data.remit.accountNumber && data.remit.routingNumber ? (
          <View style={styles.remit}>
            <Text style={styles.label}>Remit by ACH or wire</Text>
            <Text>Account name: {data.remit.accountName ?? data.vendorName}</Text>
            <Text>Account number: {data.remit.accountNumber}</Text>
            <Text>Routing number: {data.remit.routingNumber}</Text>
            <Text>
              Account type:{" "}
              {(data.remit.accountType ?? "businessChecking").replace("business", "Business ")}
            </Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Make all checks payable to {data.vendorName}.
          {data.vendorEmail
            ? ` If you have any questions concerning this invoice, contact ${data.vendorEmail}.`
            : ""}
        </Text>
        <Text style={styles.thanks}>THANK YOU FOR YOUR BUSINESS!</Text>
      </Page>
    </Document>
  );
}

export async function renderVendorBillPdf(data: VendorBillPdfData): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(vendorBillPdf(data)));
}
