import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

/** Branded purchase order — portrait letter, printable/sendable to the sub. */

export type PurchaseOrderPdfData = {
  poNumber: string;
  status: string;
  title: string;
  description: string | null;
  notes: string | null;
  issueDate: string | null;
  neededBy: string | null;
  total: number;
  projectTitle: string;
  projectAddress: string | null;
  subName: string | null;
  subTrade: string | null;
  subEmail: string | null;
  lines: { description: string; quantity: number; unit_amount: number; amount: number; cost_division: string | null }[];
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
    ? new Date(`${s}T12:00:00`).toLocaleDateString("en-US", {
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

function PurchaseOrderPdf(data: PurchaseOrderPdfData) {
  return (
    <Document title={`Purchase Order ${data.poNumber}`} author="8th Street Construction">
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
            <Text style={styles.h1}>Purchase Order</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{data.poNumber}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, color: INK }}>A division of 8th and Exchange Capital</Text>
            <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Augusta, Georgia</Text>
            {data.issueDate && (
              <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                Issued {fmtDate(data.issueDate)}
              </Text>
            )}
          </View>
        </View>
        <View style={{ height: 2, backgroundColor: COPPER, width: 90, marginTop: 2 }} />

        {/* Parties */}
        <View style={{ flexDirection: "row", gap: 40, marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>To</Text>
            <Text style={styles.value}>{data.subName ?? "—"}</Text>
            {data.subTrade && <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 1 }}>{data.subTrade}</Text>}
            {data.subEmail && <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 1 }}>{data.subEmail}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.value}>{data.projectTitle}</Text>
            {data.projectAddress && (
              <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 1 }}>{data.projectAddress}</Text>
            )}
          </View>
          <View style={{ width: 120 }}>
            <Text style={styles.label}>Needed by</Text>
            <Text style={styles.value}>{fmtDate(data.neededBy) ?? "—"}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Status</Text>
            <Text style={[styles.value, { textTransform: "capitalize" }]}>{data.status}</Text>
          </View>
        </View>

        {/* Scope */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY }}>{data.title}</Text>
          {data.description && (
            <Text style={{ fontSize: 9.5, color: INK, marginTop: 4, lineHeight: 1.5 }}>
              {data.description}
            </Text>
          )}
        </View>

        {/* Lines */}
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
            <Text style={[styles.label, { width: 60, textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.label, { width: 90, textAlign: "right" }]}>Unit</Text>
            <Text style={[styles.label, { width: 90, textAlign: "right" }]}>Amount</Text>
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
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 9.5 }}>{li.description}</Text>
                {li.cost_division && (
                  <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 1 }}>
                    Division {li.cost_division}
                  </Text>
                )}
              </View>
              <Text style={{ width: 60, textAlign: "right", fontSize: 9.5 }}>{li.quantity}</Text>
              <Text style={{ width: 90, textAlign: "right", fontSize: 9.5 }}>{money(li.unit_amount)}</Text>
              <Text style={{ width: 90, textAlign: "right", fontSize: 9.5 }}>{money(li.amount)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY }}>
              Total {money(data.total)}
            </Text>
          </View>
        </View>

        {data.notes && (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={{ fontSize: 9.5, marginTop: 3, lineHeight: 1.5 }}>{data.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={{ flexDirection: "row", gap: 40, marginTop: 36 }}>
          {["8th Street Construction", data.subName ?? "Subcontractor"].map((party) => (
            <View key={party} style={{ flex: 1 }}>
              <View style={{ borderBottomWidth: 0.75, borderBottomColor: INK, height: 28 }} />
              <Text style={{ fontSize: 8, color: MUTED, marginTop: 3 }}>{party} — signature / date</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={{ fontSize: 7.5, color: MUTED }}>
            Work performed under this purchase order is subject to the project schedule and site
            supervision. Invoice against PO {data.poNumber}.
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

export async function renderPurchaseOrderPdf(data: PurchaseOrderPdfData): Promise<Buffer> {
  return renderToBuffer(<PurchaseOrderPdf {...data} />);
}
