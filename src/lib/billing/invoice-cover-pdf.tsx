import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

/**
 * Invoice cover sheet — page 1 of the invoice packet, followed by the
 * backup invoices. Mirrors the Habitat billing format: every line shows
 * the backup invoice # ("Inv. #") and the city budget line ("City #"),
 * and the total is the sum of the attached backup invoices.
 */

export type InvoiceCoverLine = {
  description: string;
  quantity: number;
  amount: number;
  reference_number: string | null;
  city_number: number | null;
};

export type InvoiceCoverPdfData = {
  invoiceNumber: string;
  title: string | null;
  invoiceDate: string | null; // ISO
  dueDate: string | null;
  projectTitle: string;
  projectAddress: string | null;
  billToName: string | null;
  billToEmail: string | null;
  total: number;
  notes: string | null;
  lines: InvoiceCoverLine[];
  attachmentCount: number;
};

const NAVY = "#101c2a";
const COPPER = "#b5451b";
const INK = "#1a1a18";
const MUTED = "#6b645a";
const GRID = "#e0ddd6";
const ZEBRA = "#f7f5f0";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (s: string | null) =>
  s
    ? new Date(s.length <= 10 ? `${s}T12:00:00` : s).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 72,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: COPPER,
    textTransform: "uppercase",
  },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 22, color: NAVY, marginTop: 4 },
  label: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  value: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: NAVY, marginTop: 2 },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 32,
    borderTopWidth: 0.5,
    borderTopColor: GRID,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function InvoiceCoverPdf(data: InvoiceCoverPdfData) {
  const showCity = data.lines.some((li) => li.city_number != null);
  const showRef = data.lines.some((li) => !!li.reference_number);

  return (
    <Document title={`Invoice ${data.invoiceNumber}`} author="8th Street Construction">
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottomWidth: 2,
            borderBottomColor: NAVY,
            paddingBottom: 12,
          }}
        >
          <View>
            <Text style={styles.brand}>8th Street Construction</Text>
            <Text style={styles.h1}>Invoice</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{data.invoiceNumber}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, color: INK }}>A division of 8th and Exchange Capital</Text>
            <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Augusta, Georgia</Text>
            {data.invoiceDate && (
              <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                {fmtDate(data.invoiceDate)}
              </Text>
            )}
          </View>
        </View>
        <View style={{ height: 2, backgroundColor: COPPER, width: 90, marginTop: 2 }} />

        {/* Parties */}
        <View style={{ flexDirection: "row", gap: 40, marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.value}>{data.billToName ?? "—"}</Text>
            {data.billToEmail && (
              <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 1 }}>{data.billToEmail}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.value}>{data.projectTitle}</Text>
            {data.projectAddress && (
              <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 1 }}>
                {data.projectAddress}
              </Text>
            )}
          </View>
          <View style={{ width: 120 }}>
            <Text style={styles.label}>Due</Text>
            <Text style={styles.value}>{fmtDate(data.dueDate) ?? "Upon receipt"}</Text>
          </View>
        </View>

        {data.title && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY }}>
              {data.title}
            </Text>
          </View>
        )}

        {/* Lines: Description | Inv. # | City # | Amount */}
        <View style={{ marginTop: 16 }}>
          <View
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: NAVY,
              paddingBottom: 4,
            }}
          >
            <Text style={[styles.label, { flex: 1 }]}>Description</Text>
            {showRef && <Text style={[styles.label, { width: 80, textAlign: "right" }]}>Inv. #</Text>}
            {showCity && <Text style={[styles.label, { width: 60, textAlign: "right" }]}>City #</Text>}
            <Text style={[styles.label, { width: 90, textAlign: "right" }]}>Total</Text>
          </View>
          {data.lines.map((li, i) => (
            <View
              key={i}
              wrap={false}
              style={{
                flexDirection: "row",
                paddingVertical: 6,
                backgroundColor: i % 2 ? ZEBRA : undefined,
                borderBottomWidth: 0.5,
                borderBottomColor: GRID,
              }}
            >
              <Text style={{ flex: 1, paddingRight: 8, fontSize: 9.5 }}>
                {li.description}
                {li.quantity !== 1 ? ` × ${li.quantity}` : ""}
              </Text>
              {showRef && (
                <Text style={{ width: 80, textAlign: "right", fontSize: 9.5 }}>
                  {li.reference_number ?? "—"}
                </Text>
              )}
              {showCity && (
                <Text style={{ width: 60, textAlign: "right", fontSize: 9.5 }}>
                  {li.city_number ?? "—"}
                </Text>
              )}
              <Text style={{ width: 90, textAlign: "right", fontSize: 9.5 }}>
                {money(li.amount)}
              </Text>
            </View>
          ))}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 16,
              marginTop: 10,
            }}
          >
            <Text style={styles.label}>Total</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: NAVY }}>
              {money(data.total)}
            </Text>
          </View>
        </View>

        {data.attachmentCount > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 9, color: MUTED }}>
              {data.attachmentCount} backup invoice{data.attachmentCount === 1 ? "" : "s"} attached
              behind this cover sheet. The invoice total is the sum of the attached invoices.
            </Text>
          </View>
        )}

        {data.notes && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Comments or special instructions</Text>
            <Text style={{ fontSize: 9.5, marginTop: 3, lineHeight: 1.5 }}>{data.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={{ fontSize: 7.5, color: MUTED }}>
            Questions about this invoice? construction@8thandexchange.com
          </Text>
          <Text
            style={{ fontSize: 7.5, color: MUTED }}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoiceCoverPdf(data: InvoiceCoverPdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceCoverPdf {...data} />);
}
