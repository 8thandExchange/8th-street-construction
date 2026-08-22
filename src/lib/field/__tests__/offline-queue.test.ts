import { describe, expect, it } from "vitest";
import {
  buildOfflineCapture,
  canHoldPhoto,
  dailyLogSummary,
  describeQueue,
  friendlySyncError,
  isNetworkFailure,
  mergeSameDayLogs,
  shouldQueueCapture,
  todayInTimeZone,
} from "../offline-queue";
import { createMemoryStore } from "../offline-store";
import { enqueueCapture, syncOfflineQueue } from "../offline-sync";

describe("shouldQueueCapture", () => {
  it("queues when the phone is offline or the save fails as a network error", () => {
    expect(shouldQueueCapture({ online: false })).toBe(true);
    expect(shouldQueueCapture({ online: true, error: new TypeError("Failed to fetch") })).toBe(true);
    expect(shouldQueueCapture({ online: true, error: new Error("Unauthorized") })).toBe(false);
    expect(shouldQueueCapture({ online: true })).toBe(false);
  });

  it("treats fetch-style messages as network failures", () => {
    expect(isNetworkFailure(new Error("NetworkError when attempting to fetch resource."))).toBe(true);
    expect(isNetworkFailure(new Error("duplicate key"))).toBe(false);
  });
});

describe("buildOfflineCapture", () => {
  it("stamps a weekday field note with today's Augusta date", () => {
    const capture = buildOfflineCapture({
      id: "c1",
      projectId: "job-1",
      kind: "note",
      text: "  Framers set walls  ",
      createdAt: "2026-08-22T16:00:00.000Z",
      logDate: todayInTimeZone("America/New_York", new Date("2026-08-22T20:00:00.000Z")),
    });
    expect(capture.text).toBe("Framers set walls");
    expect(capture.logDate).toBe("2026-08-22");
    expect(capture.status).toBe("pending");
  });

  it("does not invent a log date for an issue", () => {
    const capture = buildOfflineCapture({
      id: "c2",
      projectId: "job-1",
      kind: "issue",
      text: "Leak at tub",
    });
    expect(capture.logDate).toBeUndefined();
  });
});

describe("mergeSameDayLogs", () => {
  it("folds two notes for the same job and day into one", () => {
    const first = buildOfflineCapture({
      id: "a",
      projectId: "job-1",
      kind: "note",
      text: "AM framing",
      logDate: "2026-08-22",
      photoIds: ["p1"],
    });
    const second = buildOfflineCapture({
      id: "b",
      projectId: "job-1",
      kind: "photo",
      text: "PM sheathing",
      logDate: "2026-08-22",
      photoIds: ["p2"],
    });
    const merged = mergeSameDayLogs(first, second);
    expect(merged?.text).toBe("AM framing\n\nPM sheathing");
    expect(merged?.photoIds).toEqual(["p1", "p2"]);
    expect(merged?.id).toBe("a");
  });

  it("does not merge issues or a different day", () => {
    const note = buildOfflineCapture({
      id: "a",
      projectId: "job-1",
      kind: "note",
      text: "AM",
      logDate: "2026-08-22",
    });
    expect(
      mergeSameDayLogs(
        note,
        buildOfflineCapture({ id: "b", projectId: "job-1", kind: "issue", text: "Leak" })
      )
    ).toBeNull();
    expect(
      mergeSameDayLogs(
        note,
        buildOfflineCapture({
          id: "c",
          projectId: "job-1",
          kind: "note",
          text: "Next day",
          logDate: "2026-08-23",
        })
      )
    ).toBeNull();
  });
});

describe("describeQueue and limits", () => {
  it("summarizes waiting and failed captures", () => {
    expect(
      describeQueue([
        buildOfflineCapture({ id: "1", projectId: "j", kind: "note", text: "a" }),
        { ...buildOfflineCapture({ id: "2", projectId: "j", kind: "issue", text: "b" }), status: "failed" },
      ]).label
    ).toBe("1 waiting · 1 could not send");
  });

  it("rejects oversized or extra photos", () => {
    expect(canHoldPhoto({ size: 100 }, 0)).toBeNull();
    expect(canHoldPhoto({ size: 9 * 1024 * 1024 }, 0)).toMatch(/8 MB/);
    expect(canHoldPhoto({ size: 10 }, 10)).toMatch(/10 photos/);
  });

  it("uses Field photo when a photo capture has no text", () => {
    expect(dailyLogSummary(buildOfflineCapture({ id: "1", projectId: "j", kind: "photo", text: "" }))).toBe(
      "Field photo"
    );
  });
});

describe("friendlySyncError", () => {
  it("explains a same-day unique log collision", () => {
    expect(
      friendlySyncError(new Error('duplicate key value violates unique constraint "project_daily_logs_project_id_log_date_key"'))
    ).toMatch(/already exists for that day/);
  });
});

describe("enqueue and sync", () => {
  it("merges a second same-day note onto the queued one", async () => {
    const store = createMemoryStore();
    await enqueueCapture(
      store,
      buildOfflineCapture({ id: "a", projectId: "job-1", kind: "note", text: "AM", logDate: "2026-08-22" })
    );
    await enqueueCapture(
      store,
      buildOfflineCapture({ id: "b", projectId: "job-1", kind: "note", text: "PM", logDate: "2026-08-22" })
    );
    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].text).toBe("AM\n\nPM");
  });

  it("uploads held photos then files the daily log and removes the row", async () => {
    const store = createMemoryStore(
      [
        buildOfflineCapture({
          id: "c1",
          projectId: "job-1",
          kind: "note",
          text: "Framers on site",
          logDate: "2026-08-22",
          photoIds: ["p1"],
        }),
      ],
      [{ id: "p1", blob: new Blob(["img"]), name: "wall.jpg", type: "image/jpeg" }]
    );
    const forms: Record<string, string>[] = [];
    const result = await syncOfflineQueue({
      store,
      uploadPhoto: async (projectId, photo) => {
        expect(projectId).toBe("job-1");
        expect(photo.id).toBe("p1");
        return `${projectId}/wall.jpg`;
      },
      createDailyLog: async (form) => {
        forms.push({
          project_id: String(form.get("project_id")),
          log_date: String(form.get("log_date")),
          summary: String(form.get("summary")),
          images: String(form.get("images")),
        });
        return { ok: true };
      },
      createPunchItem: async () => {
        throw new Error("should not punch");
      },
      createInspection: async () => {
        throw new Error("should not inspect");
      },
    });
    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(forms[0]).toMatchObject({
      project_id: "job-1",
      log_date: "2026-08-22",
      summary: "Framers on site",
    });
    expect(JSON.parse(forms[0].images)).toEqual([{ path: "job-1/wall.jpg", caption: "wall.jpg" }]);
    expect(await store.list()).toEqual([]);
  });

  it("files an issue as a punch item and keeps a failed row", async () => {
    const store = createMemoryStore([
      buildOfflineCapture({ id: "ok", projectId: "job-1", kind: "issue", text: "Tub leak" }),
      buildOfflineCapture({ id: "bad", projectId: "job-1", kind: "note", text: "Dup", logDate: "2026-08-22" }),
    ]);
    const titles: string[] = [];
    const result = await syncOfflineQueue({
      store,
      uploadPhoto: async () => {
        throw new Error("no photo");
      },
      createDailyLog: async () => ({ error: "duplicate key value violates unique constraint" }),
      createPunchItem: async (form) => {
        titles.push(String(form.get("title")));
      },
      createInspection: async () => {},
    });
    expect(titles).toEqual(["Tub leak"]);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    const leftover = await store.list();
    expect(leftover).toHaveLength(1);
    expect(leftover[0].status).toBe("failed");
    expect(leftover[0].lastError).toMatch(/already exists for that day/);
  });

  it("leaves a capture pending when the session has expired", async () => {
    const store = createMemoryStore([
      buildOfflineCapture({ id: "c1", projectId: "job-1", kind: "note", text: "AM", logDate: "2026-08-22" }),
    ]);
    const result = await syncOfflineQueue({
      store,
      uploadPhoto: async () => "x",
      createDailyLog: async () => {
        throw new Error("Not authenticated");
      },
      createPunchItem: async () => {},
      createInspection: async () => {},
    });
    expect(result).toEqual({ sent: 0, failed: 0 });
    expect((await store.list())[0].status).toBe("pending");
  });
});
