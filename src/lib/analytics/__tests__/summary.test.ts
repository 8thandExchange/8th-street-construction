import { describe, expect, it } from "vitest";
import { summarizeWorkflowEvents } from "../summary";

describe("summarizeWorkflowEvents", () => {
  it("computes completion rate and median decision time", () => {
    const summaries = summarizeWorkflowEvents([
      {
        workflow: "proposal",
        event: "start",
        entity_id: "p1",
        created_at: "2026-08-22T12:00:00.000Z",
      },
      {
        workflow: "proposal",
        event: "complete",
        entity_id: "p1",
        created_at: "2026-08-22T14:00:00.000Z",
      },
      {
        workflow: "proposal",
        event: "start",
        entity_id: "p2",
        created_at: "2026-08-22T12:00:00.000Z",
      },
      {
        workflow: "proposal",
        event: "abandon",
        entity_id: "p2",
        created_at: "2026-08-22T12:30:00.000Z",
      },
      {
        workflow: "bid",
        event: "complete",
        entity_id: "b1",
        created_at: "2026-08-22T13:00:00.000Z",
      },
    ]);

    expect(summaries[0]).toMatchObject({
      workflow: "proposal",
      starts: 2,
      completes: 1,
      abandons: 1,
    });
    expect(summaries[0].medianDecisionMinutes).toBe(75);
    expect(summaries[1]).toMatchObject({
      workflow: "bid",
      starts: 0,
      completes: 1,
      completionRate: 1,
      medianDecisionMinutes: null,
    });
  });
});
