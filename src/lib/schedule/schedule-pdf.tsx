import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { GanttModel } from "@/lib/schedule/gantt";
import { MILESTONE_STATUS_LABELS } from "@/lib/project/labels";

/**
 * Branded, downloadable build-schedule PDF (landscape letter).
 * Geometry comes straight from buildGanttModel percentages, so the chart
 * matches the on-screen Gantt exactly.
 */

export type SchedulePdfData = {
  projectTitle: string;
  addressLine: string | null;
  healthLabel: string;
  printedOn: string;
  startLabel: string | null;
  endLabel: string | null;
  model: GanttModel;
  /** milestone id → volunteer stage */
  volunteerIds: Set<string>;
};

const NAVY = "#101c2a";
const COPPER = "#b5451b";
const INK = "#1a1a18";
const MUTED = "#6b645a";
const GRID = "#e0ddd6";
const GRID_SOFT = "#eeece6";
const ZEBRA = "#f7f5f0";

const STATUS_COLORS: Record<string, { track: string; fill: string }> = {
  completed: { track: "#cdeeda", fill: "#10b981" },
  in_progress: { track: "#f2ddcf", fill: COPPER },
  blocked: { track: "#fdeec6", fill: "#f0b429" },
  pending: { track: "#e7e5e4", fill: "#a8a29e" },
};

const PAGE_W = 792;
const MARGIN = 40;
const USABLE_W = PAGE_W - MARGIN * 2; // 712
const LABEL_COL_W = 190;
const TIMELINE_W = USABLE_W - LABEL_COL_W; // 522
const ROW_H = 24;
const BAR_H = 13;

const styles = StyleSheet.create({
  page: {
    paddingTop: MARGIN,
    paddingHorizontal: MARGIN,
    paddingBottom: 56,
    fontFamily: "Helvetica",
    fontSize: 9,
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
  sub: { fontSize: 10, color: MUTED, marginTop: 3 },
  headerMetaLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerMetaValue: { fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY, marginTop: 2 },
  bigPct: { fontFamily: "Helvetica-Bold", fontSize: 26, color: NAVY },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.5,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    left: MARGIN,
    right: MARGIN,
    bottom: 24,
    borderTopWidth: 0.5,
    borderTopColor: GRID,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: MUTED },
});

function colorsFor(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.pending;
}

function pct(v: number, of: number) {
  return (v / 100) * of;
}

function GanttChart({ model }: { model: GanttModel }) {
  return (
    <View>
      {/* Axis */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: NAVY,
        }}
      >
        <View style={{ width: LABEL_COL_W, justifyContent: "flex-end", paddingBottom: 3 }}>
          <Text style={{ fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
            Phase
          </Text>
        </View>
        <View style={{ width: TIMELINE_W, height: 26 }}>
          {model.months.map((mo, i) => (
            <View
              key={`m${i}`}
              style={{
                position: "absolute",
                left: pct(mo.left, TIMELINE_W),
                width: pct(mo.width, TIMELINE_W),
                top: 0,
                height: 13,
                borderLeftWidth: 0.5,
                borderLeftColor: GRID,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 6.5,
                  color: MUTED,
                  textAlign: "center",
                  textTransform: "uppercase",
                }}
              >
                {mo.width > 4 ? mo.label : ""}
              </Text>
            </View>
          ))}
          {model.weeks.map((wk, i) => (
            <View
              key={`w${i}`}
              style={{
                position: "absolute",
                left: pct(wk.left, TIMELINE_W),
                bottom: 0,
                height: 11,
                borderLeftWidth: 0.5,
                borderLeftColor: GRID_SOFT,
                paddingLeft: 1.5,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 5.5, color: "#a8a29e" }}>{wk.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Rows */}
      <View style={{ position: "relative" }}>
        {model.bars.map((bar, idx) => {
          const c = colorsFor(bar.status);
          return (
            <View
              key={bar.id}
              style={{
                flexDirection: "row",
                height: ROW_H,
                backgroundColor: idx % 2 ? ZEBRA : undefined,
                borderBottomWidth: 0.5,
                borderBottomColor: GRID_SOFT,
              }}
              wrap={false}
            >
              <View style={{ width: LABEL_COL_W, justifyContent: "center", paddingRight: 8 }}>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, color: INK }}>
                  {bar.title}
                </Text>
                <Text style={{ fontSize: 6.5, color: MUTED, marginTop: 1 }}>
                  {bar.hasDates
                    ? `${bar.startLabel ?? ""}${bar.endLabel ? ` – ${bar.endLabel}` : ""}${
                        bar.durationDays ? `  ·  ${bar.durationDays}d` : ""
                      }${bar.progress > 0 ? `  ·  ${bar.progress}%` : ""}`
                    : "Date TBD"}
                </Text>
              </View>
              <View style={{ width: TIMELINE_W, position: "relative" }}>
                {/* month gridlines */}
                {model.months.map((mo, i) => (
                  <View
                    key={`g${i}`}
                    style={{
                      position: "absolute",
                      left: pct(mo.left, TIMELINE_W),
                      top: 0,
                      bottom: 0,
                      borderLeftWidth: 0.5,
                      borderLeftColor: GRID,
                    }}
                  />
                ))}
                {bar.hasDates && (
                  <View
                    style={{
                      position: "absolute",
                      left: pct(bar.left, TIMELINE_W),
                      width: Math.max(pct(bar.width, TIMELINE_W), 3),
                      top: (ROW_H - BAR_H) / 2,
                      height: BAR_H,
                      borderRadius: 3,
                      backgroundColor: c.track,
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${bar.progress}%`,
                        backgroundColor: c.fill,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                )}
                {/* today line */}
                {model.todayLeft != null && (
                  <View
                    style={{
                      position: "absolute",
                      left: pct(model.todayLeft, TIMELINE_W),
                      top: 0,
                      bottom: 0,
                      borderLeftWidth: 1.2,
                      borderLeftColor: COPPER,
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", marginTop: 8, gap: 14 }}>
        {[
          { label: "Complete", color: STATUS_COLORS.completed.fill },
          { label: "In progress", color: STATUS_COLORS.in_progress.fill },
          { label: "Blocked", color: STATUS_COLORS.blocked.fill },
          { label: "Upcoming", color: STATUS_COLORS.pending.fill },
        ].map((l) => (
          <View key={l.label} style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 9,
                height: 6,
                borderRadius: 1.5,
                backgroundColor: l.color,
                marginRight: 3,
              }}
            />
            <Text style={{ fontSize: 7, color: MUTED }}>{l.label}</Text>
          </View>
        ))}
        {model.todayLeft != null && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 1.2, height: 8, backgroundColor: COPPER, marginRight: 3 }} />
            <Text style={{ fontSize: 7, color: MUTED }}>Today</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PhaseTable({ model, volunteerIds }: Pick<SchedulePdfData, "model" | "volunteerIds">) {
  const col = {
    phase: { width: 220 },
    start: { width: 90 },
    end: { width: 90 },
    days: { width: 60 },
    status: { width: 120 },
    pctDone: { width: 70 },
  } as const;
  const headCell = {
    fontFamily: "Helvetica-Bold" as const,
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  };
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={styles.sectionTitle}>Phase detail</Text>
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: NAVY,
          paddingBottom: 3,
        }}
      >
        <Text style={[headCell, col.phase]}>Phase</Text>
        <Text style={[headCell, col.start]}>Start</Text>
        <Text style={[headCell, col.end]}>Finish</Text>
        <Text style={[headCell, col.days]}>Days</Text>
        <Text style={[headCell, col.status]}>Status</Text>
        <Text style={[headCell, col.pctDone]}>% Done</Text>
      </View>
      {model.bars.map((bar, idx) => (
        <View
          key={bar.id}
          wrap={false}
          style={{
            flexDirection: "row",
            paddingVertical: 4,
            backgroundColor: idx % 2 ? ZEBRA : undefined,
            borderBottomWidth: 0.5,
            borderBottomColor: GRID_SOFT,
            alignItems: "center",
          }}
        >
          <View style={col.phase}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5 }}>
              {bar.title}
              {volunteerIds.has(bar.id) ? "  ◆ Volunteer stage" : ""}
            </Text>
          </View>
          <Text style={[{ fontSize: 8.5 }, col.start]}>{bar.startLabel ?? "TBD"}</Text>
          <Text style={[{ fontSize: 8.5 }, col.end]}>{bar.endLabel ?? bar.startLabel ?? "TBD"}</Text>
          <Text style={[{ fontSize: 8.5 }, col.days]}>{bar.durationDays ?? "—"}</Text>
          <Text
            style={[
              { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: colorsFor(bar.status).fill },
              col.status,
            ]}
          >
            {MILESTONE_STATUS_LABELS[bar.status] ?? bar.status}
          </Text>
          <Text style={[{ fontSize: 8.5 }, col.pctDone]}>{bar.progress}%</Text>
        </View>
      ))}
    </View>
  );
}

function SchedulePdf(data: SchedulePdfData) {
  const { model } = data;
  return (
    <Document
      title={`Build Schedule — ${data.projectTitle}`}
      author="8th Street Construction"
    >
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottomWidth: 2,
            borderBottomColor: NAVY,
            paddingBottom: 10,
          }}
        >
          <View>
            <Text style={styles.brand}>8th Street Construction</Text>
            <Text style={styles.h1}>Build Schedule</Text>
            <Text style={styles.sub}>
              {data.projectTitle}
              {data.addressLine ? `  ·  ${data.addressLine}` : ""}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-end" }}>
            <View>
              <Text style={styles.headerMetaLabel}>Timeline</Text>
              <Text style={styles.headerMetaValue}>
                {data.startLabel ?? "TBD"} — {data.endLabel ?? "TBD"}
              </Text>
            </View>
            <View>
              <Text style={styles.headerMetaLabel}>Status</Text>
              <Text style={styles.headerMetaValue}>{data.healthLabel}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.bigPct}>{model.overallProgress}%</Text>
              <Text style={{ fontSize: 7, color: MUTED }}>
                {model.completedPhases} of {model.totalPhases} phases complete
              </Text>
            </View>
          </View>
        </View>
        <View style={{ height: 2, backgroundColor: COPPER, width: 90, marginTop: 2 }} />

        <View style={{ marginTop: 18 }}>
          <GanttChart model={model} />
        </View>

        <PhaseTable model={model} volunteerIds={data.volunteerIds} />

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            8th Street Construction · A division of 8th and Exchange Capital · Printed{" "}
            {data.printedOn}
          </Text>
          <Text style={styles.footerText}>
            Target dates reflect the current construction plan and adjust as the build progresses.
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderSchedulePdf(data: SchedulePdfData): Promise<Buffer> {
  return renderToBuffer(<SchedulePdf {...data} />);
}
