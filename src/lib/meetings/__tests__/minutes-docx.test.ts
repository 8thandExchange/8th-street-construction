import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { minutesDocxFilename, renderMinutesDocx } from "../minutes-docx";
import type { MinutesBundle } from "../minutes-format";
import type { MeetingRow } from "../types";

function meeting(overrides: Partial<MeetingRow> = {}): MeetingRow {
  return {
    id: "m1",
    series_id: null,
    title: "Monthly Coordination",
    kind: "board",
    meeting_date: "2026-08-12",
    started_at: null,
    ended_at: null,
    location: "608 Macon",
    project_id: null,
    status: "draft_minutes",
    purpose: null,
    summary: "Short recap of the month.",
    minutes_md: null,
    raw_notes: null,
    source_reference: null,
    next_meeting_date: "2026-09-09",
    prepared_by: null,
    approved_by: null,
    approved_at: null,
    approved_snapshot: null,
    reopened_at: null,
    reopen_reason: null,
    created_at: "2026-08-12T00:00:00Z",
    updated_at: "2026-08-12T00:00:00Z",
    ...overrides,
  } as MeetingRow;
}

function bundle(overrides: Partial<MinutesBundle> = {}): MinutesBundle {
  return {
    meeting: meeting(),
    attendees: [
      {
        id: "a1",
        meeting_id: "m1",
        profile_id: null,
        name: "Robby",
        email: "robby@example.com",
        organization: "Habitat",
        role: "chair",
        present: true,
      },
    ],
    agendaItems: [
      {
        id: "g1",
        meeting_id: "m1",
        position: 1,
        number: "1",
        title: "Confirm previous minutes",
        notes_md: "Approved without changes.",
        outcome: null,
        status: "closed",
        carried_from_item_id: null,
      },
    ],
    decisions: [
      {
        id: "d1",
        meeting_id: "m1",
        agenda_item_id: null,
        decision: "All four Habitat houses coordinated by 8th Street.",
        rationale: null,
        moved_by: null,
        seconded_by: null,
      },
    ],
    actionItems: [],
    ...overrides,
  };
}

async function documentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("word/document.xml")!.async("string");
}

describe("renderMinutesDocx", () => {
  it("produces a valid docx containing the minutes content", async () => {
    const buffer = await renderMinutesDocx(bundle());
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    const xml = await documentXml(buffer);
    expect(xml).toContain("Monthly Coordination");
    expect(xml).toContain("Robby (Habitat)");
    expect(xml).toContain("Confirm previous minutes");
    expect(xml).toContain("All four Habitat houses coordinated by 8th Street.");
    expect(xml).toContain("AGENDA &amp; DISCUSSION");
  });

  it("uses the approved snapshot verbatim when one exists", async () => {
    const buffer = await renderMinutesDocx(
      bundle({
        meeting: meeting({
          approved_snapshot: "# Frozen Title\n\nThe locked record.",
          title: "Live Title That Should Not Appear",
        }),
      })
    );
    const xml = await documentXml(buffer);
    expect(xml).toContain("Frozen Title");
    expect(xml).toContain("The locked record.");
    expect(xml).not.toContain("Live Title That Should Not Appear");
  });

  it("splits bold and italic spans into separate runs", async () => {
    const buffer = await renderMinutesDocx(
      bundle({
        meeting: meeting({
          approved_snapshot: "**Date:** Wednesday\n\n_Carried to next meeting._",
        }),
      })
    );
    const xml = await documentXml(buffer);
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain("<w:i/>");
    expect(xml).toContain("Carried to next meeting.");
  });
});

describe("minutesDocxFilename", () => {
  it("keeps the title and date readable, dropping unsafe characters", () => {
    expect(minutesDocxFilename(meeting())).toBe(
      "Minutes - Monthly Coordination - 2026-08-12.docx"
    );
    expect(
      minutesDocxFilename(meeting({ title: 'Board: "Q3" review / planning' }))
    ).toBe("Minutes - Board Q3 review planning - 2026-08-12.docx");
  });

  it("falls back when the title is only unsafe characters", () => {
    expect(minutesDocxFilename(meeting({ title: "///" }))).toBe(
      "Minutes - Meeting - 2026-08-12.docx"
    );
  });
});
